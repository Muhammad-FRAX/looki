export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Looki Phone Number Intelligence API',
    version: '1.0.0',
    description:
      'Self-hostable phone number intelligence service. Returns country, region, line type, formatted representations, and original carrier allocation. Real-time portability requires integration with a paid upstream provider, which the architecture supports via a pluggable lookup module.',
    license: { name: 'MIT' },
  },
  servers: [{ url: '/api/v1', description: 'Current environment' }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key (pi_live_...)',
        description: 'API key for lookup endpoints. Format: `pi_live_<base32>`',
      },
      JwtAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token for account management endpoints.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid query parameters' },
              details: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      CountryInfo: {
        type: 'object',
        required: ['code', 'name', 'calling_code'],
        properties: {
          code: { type: 'string', example: 'US', description: 'ISO 3166-1 alpha-2' },
          name: { type: 'string', example: 'United States' },
          calling_code: { type: 'string', example: '1' },
        },
      },
      CarrierInfo: {
        type: 'object',
        nullable: true,
        required: ['name', 'type', 'source'],
        properties: {
          name: { type: 'string', example: 'Verizon New York Inc.' },
          type: { type: 'string', example: 'incumbent_local_exchange_carrier' },
          source: { type: 'string', enum: ['NANPA', 'OFCOM', 'ACMA'], example: 'NANPA' },
          allocated_at: { type: 'string', nullable: true, example: '1947-10-01', description: 'ISO 8601 date' },
        },
      },
      PortabilityInfo: {
        type: 'object',
        required: ['checked', 'note'],
        properties: {
          checked: { type: 'boolean', example: false },
          note: {
            type: 'string',
            example: 'Real-time portability requires a paid upstream. Returned carrier is the original allocation.',
          },
        },
      },
      LookupResponse: {
        type: 'object',
        required: ['input', 'valid', 'portability', 'cached', 'lookup_id'],
        properties: {
          input: { type: 'string', example: '+12125550123' },
          valid: { type: 'boolean', example: true },
          e164: { type: 'string', nullable: true, example: '+12125550123' },
          national_format: { type: 'string', nullable: true, example: '(212) 555-0123' },
          international_format: { type: 'string', nullable: true, example: '+1 212-555-0123' },
          country: { oneOf: [{ $ref: '#/components/schemas/CountryInfo' }, { type: 'null' }] },
          line_type: {
            type: 'string',
            nullable: true,
            enum: [
              'mobile', 'fixed_line', 'fixed_line_or_mobile', 'toll_free', 'premium_rate',
              'shared_cost', 'voip', 'personal_number', 'pager', 'uan', 'voicemail', 'unknown',
            ],
            example: 'fixed_line',
          },
          region: { type: 'string', nullable: true, example: 'New York, NY' },
          carrier: { oneOf: [{ $ref: '#/components/schemas/CarrierInfo' }, { type: 'null' }] },
          portability: { $ref: '#/components/schemas/PortabilityInfo' },
          cached: { type: 'boolean', example: false },
          lookup_id: { type: 'string', example: '01HXX...', description: 'ULID lookup identifier' },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'email', 'role', 'created_at'],
        properties: {
          id: { type: 'string', example: '01HXX...' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      ApiKey: {
        type: 'object',
        required: ['id', 'name', 'key_prefix', 'tier', 'created_at'],
        properties: {
          id: { type: 'string', example: '01HXX...' },
          name: { type: 'string', example: 'My production key' },
          key_prefix: { type: 'string', example: 'pi_live_AB', description: 'First 8 chars of key for display' },
          tier: { type: 'string', enum: ['free'], example: 'free' },
          last_used_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      TokenPair: {
        type: 'object',
        required: ['access_token', 'refresh_token'],
        properties: {
          access_token: { type: 'string', description: 'JWT access token (15 min)' },
          refresh_token: { type: 'string', description: 'JWT refresh token (7 days)' },
        },
      },
      Job: {
        type: 'object',
        required: ['job_id', 'status', 'total', 'processed', 'created_at'],
        properties: {
          job_id: { type: 'string', example: '01HXX...' },
          status: { type: 'string', enum: ['queued', 'processing', 'complete', 'failed'], example: 'queued' },
          total: { type: 'integer', example: 50000 },
          processed: { type: 'integer', example: 0 },
          webhook_url: { type: 'string', nullable: true, format: 'uri' },
          error_message: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          finished_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
  paths: {
    // -------------------------------------------------------------------------
    // Meta
    // -------------------------------------------------------------------------
    '/health': {
      get: {
        tags: ['Meta'],
        summary: 'Health check',
        description: 'Returns 200 if the API process is up.',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } },
              },
            },
          },
        },
      },
    },
    '/ready': {
      get: {
        tags: ['Meta'],
        summary: 'Readiness check',
        description: 'Returns 200 if PostgreSQL is reachable.',
        responses: {
          200: { description: 'Service is ready', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } },
          503: { description: 'Database not reachable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/metrics': {
      get: {
        tags: ['Meta'],
        summary: 'Prometheus metrics',
        description: 'Exposes HTTP request counts, latency histograms, cache hit/miss counters, queue depth, and DB pool stats in Prometheus text format.',
        responses: {
          200: {
            description: 'Prometheus text format',
            content: { 'text/plain': { schema: { type: 'string' } } },
          },
        },
      },
    },
    // -------------------------------------------------------------------------
    // Auth
    // -------------------------------------------------------------------------
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created — returns token pair and user',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/TokenPair' },
                    { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } },
                  ],
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Successful login — returns token pair and user',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/TokenPair' },
                    { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } },
                  ],
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Rate limited (10/hour/IP)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refresh_token'],
                properties: { refresh_token: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'New access token',
            content: {
              'application/json': {
                schema: { type: 'object', required: ['access_token'], properties: { access_token: { type: 'string' } } },
              },
            },
          },
          401: { description: 'Refresh token invalid or expired', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout — revoke refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['refresh_token'], properties: { refresh_token: { type: 'string' } } },
            },
          },
        },
        responses: { 204: { description: 'Logged out (idempotent)' } },
      },
    },
    // -------------------------------------------------------------------------
    // Account (JWT-authenticated)
    // -------------------------------------------------------------------------
    '/me': {
      get: {
        tags: ['Account'],
        summary: 'Get current user',
        security: [{ JwtAuth: [] }],
        responses: {
          200: {
            description: 'Current user',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/me/keys': {
      get: {
        tags: ['Account'],
        summary: 'List API keys',
        security: [{ JwtAuth: [] }],
        responses: {
          200: {
            description: 'List of active API keys',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { keys: { type: 'array', items: { $ref: '#/components/schemas/ApiKey' } } },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        tags: ['Account'],
        summary: 'Create API key',
        description: 'Returns the plaintext key exactly once. Store it securely — it cannot be retrieved again.',
        security: [{ JwtAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 100 } } },
            },
          },
        },
        responses: {
          201: {
            description: 'API key created — plaintext returned once',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    key: {
                      allOf: [
                        { $ref: '#/components/schemas/ApiKey' },
                        { type: 'object', properties: { plaintext: { type: 'string', description: 'Full key — shown once' } } },
                      ],
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/me/keys/{key_id}': {
      delete: {
        tags: ['Account'],
        summary: 'Revoke API key',
        security: [{ JwtAuth: [] }],
        parameters: [{ name: 'key_id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Key revoked' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Key not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/me/usage': {
      get: {
        tags: ['Account'],
        summary: 'Daily usage counts',
        security: [{ JwtAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, example: '2025-01-01' },
          { name: 'to', in: 'query', schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, example: '2025-01-31' },
        ],
        responses: {
          200: {
            description: 'Daily usage aggregated by date',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    usage: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          date: { type: 'string', example: '2025-01-15' },
                          count: { type: 'integer', example: 42 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    // -------------------------------------------------------------------------
    // Lookup (API key-authenticated)
    // -------------------------------------------------------------------------
    '/lookup': {
      get: {
        tags: ['Lookup'],
        summary: 'Single number lookup',
        description: 'Parse and enrich a phone number. Returns country, line type, region, and original carrier allocation.',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'number',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Phone number in E.164 format (e.g. +12125550123) or local format combined with country param.',
            example: '+12125550123',
          },
          {
            name: 'country',
            in: 'query',
            schema: { type: 'string', minLength: 2, maxLength: 2 },
            description: 'ISO 3166-1 alpha-2 default country code used when number is not in E.164.',
            example: 'US',
          },
        ],
        responses: {
          200: {
            description: 'Lookup result',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LookupResponse' } } },
          },
          400: { description: 'Invalid number or parameters', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Missing or invalid API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Rate limit exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          503: { description: 'Database unavailable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/lookup/bulk': {
      post: {
        tags: ['Lookup'],
        summary: 'Synchronous bulk lookup',
        description: 'Look up up to 1,000 numbers in a single synchronous request. Each number in the request counts against the per-minute rate limit.',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['numbers'],
                properties: {
                  numbers: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 1000 },
                  country: { type: 'string', minLength: 2, maxLength: 2, description: 'Default country for non-E.164 numbers' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Array of lookup results (same order as input)',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    oneOf: [
                      { $ref: '#/components/schemas/LookupResponse' },
                      { $ref: '#/components/schemas/Error' },
                    ],
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Missing or invalid API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Rate limit exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/lookup/jobs': {
      post: {
        tags: ['Lookup'],
        summary: 'Create async bulk job',
        description: 'Submit up to 1,000,000 numbers for asynchronous processing. Alternatively upload a CSV/plain-text file via multipart. Result CSV is available at `/lookup/jobs/{job_id}/result` when complete.',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['numbers'],
                properties: {
                  numbers: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 1000000 },
                  country: { type: 'string', minLength: 2, maxLength: 2 },
                  webhook_url: { type: 'string', format: 'uri', description: 'Called with job result when complete' },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'CSV or plain text, one number per line' },
                  country: { type: 'string', minLength: 2, maxLength: 2 },
                  webhook_url: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: {
          202: {
            description: 'Job accepted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    job_id: { type: 'string' },
                    status: { type: 'string', example: 'queued' },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Missing or invalid API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          503: { description: 'Job queue unavailable (Redis required)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/lookup/jobs/{job_id}': {
      get: {
        tags: ['Lookup'],
        summary: 'Get job status',
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'job_id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Job status',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Job' } } },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Forbidden — job belongs to another user', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Job not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/lookup/jobs/{job_id}/result': {
      get: {
        tags: ['Lookup'],
        summary: 'Download job result CSV',
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: 'job_id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'CSV file stream',
            content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Job not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Job not yet complete', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          410: { description: 'Result file expired', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------
    '/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'System stats',
        description: 'Returns total users, lookups, cache hit ratio, queue depth, and p50/p95/p99 latency for last 24h.',
        security: [{ JwtAuth: [] }],
        responses: {
          200: {
            description: 'System statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stats: {
                      type: 'object',
                      properties: {
                        total_users: { type: 'integer' },
                        total_lookups: { type: 'integer' },
                        cache_hit_ratio: { type: 'number', minimum: 0, maximum: 1 },
                        queue_depth: { type: 'integer' },
                        latency_24h: {
                          type: 'object',
                          properties: {
                            p50: { type: 'integer', nullable: true },
                            p95: { type: 'integer', nullable: true },
                            p99: { type: 'integer', nullable: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Admin role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users (paginated)',
        security: [{ JwtAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: {
            description: 'Paginated user list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        pages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Admin role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/admin/data/reload': {
      post: {
        tags: ['Admin'],
        summary: 'Trigger data reload',
        description: 'Flushes the lookup cache (via SCAN, never KEYS) and signals the data-loader to re-ingest prefix data.',
        security: [{ JwtAuth: [] }],
        responses: {
          202: {
            description: 'Accepted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'accepted' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Admin role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
  tags: [
    { name: 'Meta', description: 'Health, readiness, and observability endpoints' },
    { name: 'Auth', description: 'Account registration, login, and token management' },
    { name: 'Account', description: 'User profile, API key management, and usage history' },
    { name: 'Lookup', description: 'Phone number intelligence — single, bulk, and async jobs' },
    { name: 'Admin', description: 'Administrative endpoints (admin role required)' },
  ],
};
