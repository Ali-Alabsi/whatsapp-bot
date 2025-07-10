const mysql = require('mysql2/promise');
const logger = require('../utils/logger');
const config = require('../config/db.config');

let pool = null;
let isInitialized = false;

/**
 * Initialize the database connection pool
 * @returns {Promise<boolean>} True if initialization was successful
 */
async function initialize() {
    if (isInitialized) {
        logger.info('Database already initialized');
        return true;
    }

    try {
        logger.info('🚀 Initializing MySQL database connection...');
        
        // Create connection pool
        pool = mysql.createPool({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database,
            port: config.port || 3306,
            charset: 'utf8mb4',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            timezone: '+00:00', // Use UTC
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000
        });

        // Test the connection
        const connection = await pool.getConnection();
        try {
            await connection.query('SELECT 1');
            logger.info('✅ Database connection successful');
            
            // Create tables if they don't exist
            await createTables(connection);
            
            isInitialized = true;
            return true;
        } finally {
            connection.release();
        }
    } catch (error) {
        logger.error('❌ Failed to initialize database:', error);
        if (pool) {
            await pool.end();
            pool = null;
        }
        throw error;
    }
}

/**
 * Close the database connection pool
 * @returns {Promise<void>}
 */
async function close() {
    if (pool) {
        try {
            await pool.end();
            pool = null;
            isInitialized = false;
            logger.info('✅ Database connection pool closed');
        } catch (error) {
            logger.error('Error closing database pool:', error);
            throw error;
        }
    }
}

/**
 * Create database tables if they don't exist
 * @param {object} connection - Database connection
 * @returns {Promise<void>}
 */
async function createTables(connection) {
    try {
        await connection.beginTransaction();
        
        logger.info('Creating database tables if they do not exist...');
        
        // Create users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                phone_number VARCHAR(20) NOT NULL,
                name VARCHAR(255) DEFAULT NULL,
                is_subscribed TINYINT(1) NOT NULL DEFAULT 1,
                language VARCHAR(10) NOT NULL DEFAULT 'ar',
                is_admin TINYINT(1) NOT NULL DEFAULT 0,
                last_seen DATETIME DEFAULT NULL,
                message_count INT UNSIGNED NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY users_phone_number_unique (phone_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        // Create messages table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                message_id VARCHAR(255) NOT NULL,
                from_number VARCHAR(20) NOT NULL,
                to_number VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                message_type VARCHAR(50) DEFAULT 'text',
                is_command TINYINT(1) NOT NULL DEFAULT 0,
                command_name VARCHAR(100) DEFAULT NULL,
                is_processed TINYINT(1) NOT NULL DEFAULT 0,
                error_message TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY messages_message_id_unique (message_id),
                KEY idx_messages_from_number (from_number),
                KEY idx_messages_created_at (created_at),
                KEY idx_messages_is_processed (is_processed)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        // Create scheduled_messages table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS scheduled_messages (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                name VARCHAR(255) DEFAULT NULL,
                description TEXT,
                cron_expression VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                target_type ENUM('ALL', 'GROUP', 'INDIVIDUAL') NOT NULL DEFAULT 'ALL',
                target_id VARCHAR(255) DEFAULT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                last_run DATETIME DEFAULT NULL,
                next_run DATETIME DEFAULT NULL,
                created_by VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_scheduled_messages_next_run (next_run, is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        // Create auto_replies table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS auto_replies (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                name VARCHAR(255) DEFAULT NULL,
                keyword VARCHAR(255) NOT NULL,
                keyword_type ENUM('CONTAINS', 'EXACT', 'STARTS_WITH', 'ENDS_WITH', 'REGEX') NOT NULL DEFAULT 'CONTAINS',
                response TEXT NOT NULL,
                response_type VARCHAR(50) NOT NULL DEFAULT 'TEXT',
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                priority INT NOT NULL DEFAULT 0,
                created_by VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_auto_replies_keyword (keyword, is_active),
                KEY idx_auto_replies_priority (priority)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        // Initialize default data
        await initializeDefaultData(connection);
        
        await connection.commit();
        logger.info('✅ Database tables created successfully');
    } catch (error) {
        await connection.rollback();
        logger.error('❌ Error creating database tables:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Initialize default data
 * @param {object} connection - Database connection
 * @returns {Promise<void>}
 */
async function initializeDefaultData(connection) {
    try {
        // Check if we have any users
        const [[{ count }]] = await connection.query('SELECT COUNT(*) as count FROM users');
        
        if (count === 0) {
            logger.info('No users found, creating default admin user...');
            
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            // Create default admin user
            await connection.query(
                'INSERT INTO users (phone_number, name, is_subscribed, language, is_admin, last_seen) VALUES (?, ?, 1, ?, 1, ?)',
                ['1234567890', 'Admin', 'en', now]
            );
            
            logger.info('✅ Created default admin user');
        }
    } catch (error) {
        logger.error('Error initializing default data:', error);
        throw error;
    }
}

// Export all the database functions
module.exports = {
    initialize,
    close,
    isInitialized: () => isInitialized,
    
    /**
     * Get a connection from the pool
     * @returns {Promise<object>} Database connection
     */
    getConnection: async () => {
        if (!isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return pool.getConnection();
    },
    
    /**
     * Execute a query with parameters
     * @param {string} sql - SQL query
     * @param {Array} [params=[]] - Query parameters
     * @returns {Promise<Array>} Query results
     */
    query: async (sql, params = []) => {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(sql, params);
            return rows;
        } finally {
            connection.release();
        }
    },
    
    /**
     * Execute a query and return the first row
     * @param {string} sql - SQL query
     * @param {Array} [params=[]] - Query parameters
     * @returns {Promise<object|null>} First row or null
     */
    queryOne: async (sql, params = []) => {
        const rows = await module.exports.query(sql, params);
        return rows[0] || null;
    },
    
    /**
     * Insert a record and return the insert ID
     * @param {string} table - Table name
     * @param {object} data - Data to insert
     * @returns {Promise<number>} Insert ID
     */
    insert: async (table, data) => {
        const columns = Object.keys(data);
        const values = columns.map(col => data[col]);
        const placeholders = columns.map(() => '?').join(',');
        
        const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
        const connection = await pool.getConnection();
        
        try {
            const [result] = await connection.query(sql, values);
            return result.insertId;
        } finally {
            connection.release();
        }
    },
    
    /**
     * Update records matching the criteria
     * @param {string} table - Table name
     * @param {object} data - Data to update
     * @param {object} where - WHERE conditions
     * @returns {Promise<number>} Number of affected rows
     */
    update: async (table, data, where) => {
        const setClause = Object.keys(data).map(col => `${col} = ?`).join(',');
        const whereClause = Object.keys(where).map(col => `${col} = ?`).join(' AND ');
        const values = [...Object.values(data), ...Object.values(where)];
        
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        const connection = await pool.getConnection();
        
        try {
            const [result] = await connection.query(sql, values);
            return result.affectedRows;
        } finally {
            connection.release();
        }
    },
    
    /**
     * Delete records matching the criteria
     * @param {string} table - Table name
     * @param {object} where - WHERE conditions
     * @returns {Promise<number>} Number of affected rows
     */
    delete: async (table, where) => {
        const whereClause = Object.keys(where).map(col => `${col} = ?`).join(' AND ');
        const values = Object.values(where);
        
        const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
        const connection = await pool.getConnection();
        
        try {
            const [result] = await connection.query(sql, values);
            return result.affectedRows;
        } finally {
            connection.release();
        }
    },
    
    /**
     * Begin a transaction
     * @returns {Promise<object>} Database connection with transaction
     */
    beginTransaction: async () => {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        return connection;
    },
    
    /**
     * Commit a transaction
     * @param {object} connection - Database connection with transaction
     */
    commit: async (connection) => {
        try {
            await connection.commit();
        } finally {
            connection.release();
        }
    },
    
    /**
     * Rollback a transaction
     * @param {object} connection - Database connection with transaction
     */
    rollback: async (connection) => {
        try {
            await connection.rollback();
        } finally {
            connection.release();
        }
    }
};
