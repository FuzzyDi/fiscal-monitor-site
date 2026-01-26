const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const logger = require('../utils/logger');
const requireAdminKey = require('../middleware/admin-auth');
const { generateToken } = require('../utils/helpers');

// All admin routes require authentication
router.use(requireAdminKey);

/**
 * GET /api/v1/admin/overview
 * System-wide statistics
 */
router.get('/overview', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT shop_inn) as total_inns,
        COUNT(DISTINCT shop_inn) FILTER (WHERE is_registered = true) as registered_inns,
        COUNT(DISTINCT shop_inn) FILTER (WHERE is_registered = false) as unregistered_inns,
        COUNT(*) as total_states,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_count,
        COUNT(*) FILTER (WHERE severity = 'DANGER') as danger_count,
        COUNT(*) FILTER (WHERE severity = 'WARN') as warn_count,
        COUNT(*) FILTER (WHERE severity = 'INFO') as info_count
       FROM fiscal_last_state`
    );
    
    const stats = result.rows[0];
    
    res.json({
      totalInns: parseInt(stats.total_inns) || 0,
      registeredInns: parseInt(stats.registered_inns) || 0,
      unregisteredInns: parseInt(stats.unregistered_inns) || 0,
      totalStates: parseInt(stats.total_states) || 0,
      criticalCount: parseInt(stats.critical_count) || 0,
      dangerCount: parseInt(stats.danger_count) || 0,
      warnCount: parseInt(stats.warn_count) || 0,
      infoCount: parseInt(stats.info_count) || 0
    });
  } catch (err) {
    logger.error('Error fetching overview:', err);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

/**
 * GET /api/v1/admin/inns
 * List all unique INNs with their registration status and aggregated POS metrics.
 * NOTE: This endpoint is INN-level (company-level). For shop-level dashboard use /dashboard/shops.
 */
router.get('/inns', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        fls.shop_inn,
        (CASE WHEN BOOL_OR(fls.is_registered) THEN true ELSE false END) AS is_registered,
        r.title as registration_title,
        r.is_active as registration_active,
        COUNT(*)::int as pos_count,
        COUNT(DISTINCT COALESCE(fls.shop_number, 0))::int as shop_count,
        CASE WHEN COUNT(DISTINCT COALESCE(fls.shop_number, 0)) = 1
          THEN NULLIF(MAX(fls.shop_name), '')
          ELSE NULL
        END AS shop_name,
        MAX(fls.updated_at) as last_seen,
        CASE MAX(
          CASE fls.severity
            WHEN 'CRITICAL' THEN 4
            WHEN 'DANGER' THEN 3
            WHEN 'WARN' THEN 2
            WHEN 'INFO' THEN 1
            ELSE 0
          END
        )
          WHEN 4 THEN 'CRITICAL'
          WHEN 3 THEN 'DANGER'
          WHEN 2 THEN 'WARN'
          WHEN 1 THEN 'INFO'
          ELSE 'INFO'
        END AS worst_severity,
        SUM(CASE WHEN fls.severity = 'CRITICAL' THEN 1 ELSE 0 END)::int AS critical_count,
        SUM(CASE WHEN fls.severity = 'DANGER' THEN 1 ELSE 0 END)::int AS danger_count,
        SUM(CASE WHEN fls.severity = 'WARN' THEN 1 ELSE 0 END)::int AS warn_count,
        SUM(CASE WHEN fls.severity = 'INFO' THEN 1 ELSE 0 END)::int AS info_count
       FROM fiscal_last_state fls
       LEFT JOIN registrations r ON r.shop_inn = fls.shop_inn
       GROUP BY fls.shop_inn, r.title, r.is_active
       ORDER BY fls.shop_inn ASC`
    );

    res.json({ inns: result.rows });
  } catch (err) {
    logger.error('Error fetching INNs:', err);
    res.status(500).json({ error: 'Failed to fetch INNs' });
  }
});


/**
 * GET /api/v1/admin/dashboard/shops
 * Shop-level dashboard (one row per shopInn+shopNumber)
 */
router.get('/dashboard/shops', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        fls.shop_inn,
        COALESCE(fls.shop_number, 0) as shop_number,
        NULLIF(MAX(fls.shop_name), '') as shop_name,
        (CASE WHEN BOOL_OR(fls.is_registered) THEN true ELSE false END) AS is_registered,
        r.title as registration_title,
        r.is_active as registration_active,
        COUNT(*)::int as pos_count,
        MAX(fls.updated_at) as last_seen,
        CASE MAX(
          CASE fls.severity
            WHEN 'CRITICAL' THEN 4
            WHEN 'DANGER' THEN 3
            WHEN 'WARN' THEN 2
            WHEN 'INFO' THEN 1
            ELSE 0
          END
        )
          WHEN 4 THEN 'CRITICAL'
          WHEN 3 THEN 'DANGER'
          WHEN 2 THEN 'WARN'
          WHEN 1 THEN 'INFO'
          ELSE 'INFO'
        END AS worst_severity,
        SUM(CASE WHEN fls.severity = 'CRITICAL' THEN 1 ELSE 0 END)::int AS critical_count,
        SUM(CASE WHEN fls.severity = 'DANGER' THEN 1 ELSE 0 END)::int AS danger_count,
        SUM(CASE WHEN fls.severity = 'WARN' THEN 1 ELSE 0 END)::int AS warn_count,
        SUM(CASE WHEN fls.severity = 'INFO' THEN 1 ELSE 0 END)::int AS info_count
      FROM fiscal_last_state fls
      LEFT JOIN registrations r ON r.shop_inn = fls.shop_inn
      GROUP BY fls.shop_inn, COALESCE(fls.shop_number, 0), r.title, r.is_active
      ORDER BY fls.shop_inn ASC, COALESCE(fls.shop_number, 0) ASC`
    );

    res.json({ shops: result.rows });
  } catch (err) {
    logger.error('Error fetching shop dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch shop dashboard' });
  }
});

/**
 * GET /api/v1/admin/state
 * Get POS last states.
 * Optional filters:
 *  - shopInn (INN)
 *  - shopNumber (integer)
 *  - severity (CRITICAL|DANGER|WARN|INFO)
 *  - limit (integer)
 */
router.get('/state', async (req, res) => {
  try {
    const { shopInn, shopNumber, severity, limit } = req.query;

    const where = [];
    const params = [];

    if (shopInn) {
      params.push(String(shopInn));
      where.push(`shop_inn = $${params.length}`);
    }

    if (shopNumber !== undefined && shopNumber !== null && String(shopNumber).trim() !== '') {
      const n = parseInt(String(shopNumber), 10);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: 'shopNumber must be an integer' });
      }
      params.push(n);
      where.push(`shop_number = $${params.length}`);
    }

    if (severity) {
      const sev = String(severity).toUpperCase().trim();
      const allowed = ['CRITICAL', 'DANGER', 'WARN', 'INFO'];
      if (!allowed.includes(sev)) {
        return res.status(400).json({ error: 'severity must be one of CRITICAL, DANGER, WARN, INFO' });
      }
      params.push(sev);
      where.push(`severity = $${params.length}`);
    }

    let q = 'SELECT * FROM fiscal_last_state';
    if (where.length) {
      q += ' WHERE ' + where.join(' AND ');
    }
    q += ' ORDER BY updated_at DESC';

    // Conservative default limit.
    const defaultLimit = where.length ? 5000 : 1000;
    let lim = defaultLimit;
    if (limit !== undefined && limit !== null && String(limit).trim() !== '') {
      const n = parseInt(String(limit), 10);
      if (!Number.isFinite(n) || n <= 0) {
        return res.status(400).json({ error: 'limit must be a positive integer' });
      }
      lim = Math.min(n, 20000);
    }
    q += ` LIMIT ${lim}`;

    const result = await pool.query(q, params);

    res.json({ states: result.rows });
  } catch (err) {
    logger.error('Error fetching state:', err);
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});


/**
 * POST /api/v1/admin/registrations
 * Create or update a registration
 */
router.post('/registrations', async (req, res) => {
  try {
    const { shopInn, title, isActive } = req.body;
    
    if (!shopInn || !title) {
      return res.status(400).json({ error: 'shopInn and title are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO registrations (shop_inn, title, is_active)
       VALUES ($1, $2, $3)
       ON CONFLICT (shop_inn) DO UPDATE SET
         title = EXCLUDED.title,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING *`,
      [shopInn, title, isActive !== false]
    );
    
    // Update is_registered flag in fiscal_last_state
    await pool.query(
      'UPDATE fiscal_last_state SET is_registered = $1 WHERE shop_inn = $2',
      [result.rows[0].is_active, shopInn]
    );
    
    logger.info(`Registration created/updated: ${shopInn}`);
    
    res.json({ registration: result.rows[0] });
  } catch (err) {
    logger.error('Error creating registration:', err);
    res.status(500).json({ error: 'Failed to create registration' });
  }
});

/**
 * POST /api/v1/admin/tokens
 * Issue a new access token for a registered INN
 */
router.post('/tokens', async (req, res) => {
  try {
    const { shopInn, label } = req.body;
    
    if (!shopInn || !label) {
      return res.status(400).json({ error: 'shopInn and label are required' });
    }
    
    // Verify registration exists and is active
    const regCheck = await pool.query(
      'SELECT is_active FROM registrations WHERE shop_inn = $1',
      [shopInn]
    );
    
    if (regCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    if (!regCheck.rows[0].is_active) {
      return res.status(400).json({ error: 'Registration is not active' });
    }
    
    // Generate token
    const token = generateToken();
    
    const result = await pool.query(
      `INSERT INTO access_tokens (token, shop_inn, label)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [token, shopInn, label]
    );
    
    logger.info(`Token issued for ${shopInn}: ${label}`);
    
    res.json({ token: result.rows[0] });
  } catch (err) {
    logger.error('Error issuing token:', err);
    res.status(500).json({ error: 'Failed to issue token' });
  }
});

/**
 * GET /api/v1/admin/registrations
 * List all registrations
 */
router.get('/registrations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
        COUNT(at.token) as token_count
       FROM registrations r
       LEFT JOIN access_tokens at ON at.shop_inn = r.shop_inn
       GROUP BY r.shop_inn, r.title, r.is_active, r.created_at, r.updated_at
       ORDER BY r.created_at DESC`
    );
    
    res.json({ registrations: result.rows });
  } catch (err) {
    logger.error('Error fetching registrations:', err);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

/**
 * PUT /api/v1/admin/registrations/:shopInn
 * Update an existing registration
 */
router.put('/registrations/:shopInn', async (req, res) => {
  try {
    const { shopInn } = req.params;
    const { title, isActive } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    
    // Check if registration exists
    const existing = await pool.query(
      'SELECT * FROM registrations WHERE shop_inn = $1',
      [shopInn]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    const result = await pool.query(
      `UPDATE registrations 
       SET title = $1, is_active = $2, updated_at = NOW()
       WHERE shop_inn = $3
       RETURNING *`,
      [title, isActive !== false, shopInn]
    );
    
    // Update is_registered flag in fiscal_last_state
    await pool.query(
      'UPDATE fiscal_last_state SET is_registered = $1 WHERE shop_inn = $2',
      [result.rows[0].is_active, shopInn]
    );
    
    logger.info(`Registration updated: ${shopInn}`);
    
    res.json({ registration: result.rows[0] });
  } catch (err) {
    logger.error('Error updating registration:', err);
    res.status(500).json({ error: 'Failed to update registration' });
  }
});

/**
 * DELETE /api/v1/admin/registrations/:shopInn
 * Delete a registration and all its tokens
 */
router.delete('/registrations/:shopInn', async (req, res) => {
  try {
    const { shopInn } = req.params;
    
    // Check if registration exists
    const existing = await pool.query(
      'SELECT * FROM registrations WHERE shop_inn = $1',
      [shopInn]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    // Delete registration (tokens will be deleted via CASCADE)
    await pool.query(
      'DELETE FROM registrations WHERE shop_inn = $1',
      [shopInn]
    );
    
    // Update is_registered flag in fiscal_last_state
    await pool.query(
      'UPDATE fiscal_last_state SET is_registered = false WHERE shop_inn = $1',
      [shopInn]
    );
    
    logger.info(`Registration deleted: ${shopInn}`);
    
    res.json({ success: true, message: 'Registration deleted' });
  } catch (err) {
    logger.error('Error deleting registration:', err);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

/**
 * GET /api/v1/admin/tokens
 * List all tokens, optionally filtered by INN
 */
router.get('/tokens', async (req, res) => {
  try {
    const { shopInn } = req.query;
    
    let query = `
      SELECT at.*, r.title as registration_title
      FROM access_tokens at
      LEFT JOIN registrations r ON r.shop_inn = at.shop_inn
    `;
    let params = [];
    
    if (shopInn) {
      query += ' WHERE at.shop_inn = $1';
      params = [shopInn];
    }
    
    query += ' ORDER BY at.created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({ tokens: result.rows });
  } catch (err) {
    logger.error('Error fetching tokens:', err);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

/**
 * PUT /api/v1/admin/tokens/:token
 * Update token label
 */
router.put('/tokens/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { label } = req.body;
    
    if (!label) {
      return res.status(400).json({ error: 'label is required' });
    }
    
    // Check if token exists
    const existing = await pool.query(
      'SELECT * FROM access_tokens WHERE token = $1',
      [token]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    const result = await pool.query(
      `UPDATE access_tokens 
       SET label = $1
       WHERE token = $2
       RETURNING *`,
      [label, token]
    );
    
    logger.info(`Token updated: ${token.substring(0, 16)}...`);
    
    res.json({ token: result.rows[0] });
  } catch (err) {
    logger.error('Error updating token:', err);
    res.status(500).json({ error: 'Failed to update token' });
  }
});

/**
 * DELETE /api/v1/admin/tokens/:token
 * Revoke (delete) an access token
 */
router.delete('/tokens/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Check if token exists
    const existing = await pool.query(
      'SELECT * FROM access_tokens WHERE token = $1',
      [token]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    await pool.query(
      'DELETE FROM access_tokens WHERE token = $1',
      [token]
    );
    
    logger.info(`Token revoked: ${token.substring(0, 16)}...`);
    
    res.json({ success: true, message: 'Token revoked' });
  } catch (err) {
    logger.error('Error revoking token:', err);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

/**
 * GET /api/v1/admin/export/state
 * Export POS states to Excel
 */
router.get('/export/state', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const { shopInn, shopNumber, severity } = req.query;
    
    // Build query
    let query = `
      SELECT 
        fls.*,
        r.title as registration_title,
        r.is_active as registration_active
      FROM fiscal_last_state fls
      LEFT JOIN registrations r ON r.shop_inn = fls.shop_inn
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;
    
    if (shopInn) {
      paramCount++;
      query += ` AND fls.shop_inn = $${paramCount}`;
      params.push(shopInn);
    }
    
    if (shopNumber !== undefined && shopNumber !== null && String(shopNumber).trim() !== '') {
      paramCount++;
      query += ` AND fls.shop_number = $${paramCount}`;
      params.push(String(shopNumber).trim());
    }
    
    if (severity) {
      paramCount++;
      query += ` AND fls.severity = $${paramCount}`;
      params.push(severity.toUpperCase());
    }
    
    query += ` ORDER BY fls.shop_inn, fls.shop_number, fls.pos_number`;
    
    const result = await pool.query(query, params);
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Fiscal Monitor';
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet('POS State');
    
    // Define columns
    sheet.columns = [
      { header: 'ИНН', key: 'shop_inn', width: 15 },
      { header: 'Компания', key: 'registration_title', width: 30 },
      { header: 'Магазин №', key: 'shop_number', width: 12 },
      { header: 'Касса №', key: 'pos_number', width: 12 },
      { header: 'Название', key: 'shop_name', width: 25 },
      { header: 'IP адрес', key: 'pos_ip', width: 15 },
      { header: 'Важность', key: 'severity', width: 12 },
      { header: 'Обновлено', key: 'updated_at', width: 20 },
      { header: 'Зарегистрирован', key: 'is_registered', width: 15 },
      { header: 'Terminal ID', key: 'terminal_id', width: 20 },
      { header: 'Чеков', key: 'receipt_count', width: 12 },
      { header: 'Макс. чеков', key: 'receipt_max', width: 12 },
      { header: 'Не отправлено', key: 'unsent_count', width: 14 },
      { header: 'Z-отчётов', key: 'z_count', width: 12 },
      { header: 'Макс. Z', key: 'z_max', width: 12 },
      { header: 'Осталось Z', key: 'z_remaining', width: 12 },
      { header: 'Алерты', key: 'alerts', width: 50 }
    ];
    
    // Add data rows
    result.rows.forEach(row => {
      const snapshot = row.snapshot || {};
      const fiscal = snapshot.fiscal || {};
      const alerts = snapshot.alerts || [];
      
      sheet.addRow({
        shop_inn: row.shop_inn,
        registration_title: row.registration_title || '-',
        shop_number: row.shop_number || '0',
        pos_number: row.pos_number || '0',
        shop_name: row.shop_name || '-',
        pos_ip: row.pos_ip || '-',
        severity: row.severity || 'INFO',
        updated_at: row.updated_at,
        is_registered: row.is_registered ? 'Да' : 'Нет',
        terminal_id: fiscal.terminalId || '-',
        receipt_count: fiscal.receiptCount ?? '-',
        receipt_max: fiscal.receiptMaxCount ?? '-',
        unsent_count: fiscal.unsentCount ?? '-',
        z_count: fiscal.zReportCount ?? fiscal.zCount ?? '-',
        z_max: fiscal.zReportMaxCount ?? fiscal.zMax ?? '-',
        z_remaining: fiscal.zRemaining ?? '-',
        alerts: alerts.map(a => `[${a.severity}] ${a.type}: ${a.message || ''}`).join('; ') || '-'
      });
    });
    
    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Apply severity colors
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const severity = row.getCell('severity').value;
      let fillColor = 'FFFFFFFF';
      
      switch (severity) {
        case 'CRITICAL':
          fillColor = 'FFFF0000'; // Red
          break;
        case 'DANGER':
          fillColor = 'FFFFA500'; // Orange
          break;
        case 'WARN':
          fillColor = 'FFFFFF00'; // Yellow
          break;
        case 'INFO':
          fillColor = 'FF90EE90'; // Light green
          break;
      }
      
      row.getCell('severity').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };
    });
    
    // Set response headers
    const filename = `pos_state_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
    
    logger.info('State exported to Excel');
  } catch (err) {
    logger.error('Error exporting state:', err);
    res.status(500).json({ error: 'Failed to export state' });
  }
});

module.exports = router;
