/**
 * Tracing Module
 * Functional approach to tracing and logging agent interactions
 */

// Trace event types
export const TraceEventType = Object.freeze({
  AGENT_START: 'agent_start',
  AGENT_END: 'agent_end',
  TOOL_START: 'tool_start',
  TOOL_END: 'tool_end',
  HANDOFF: 'handoff',
  ERROR: 'error',
  CUSTOM: 'custom',
});

// Create a trace event
export const createTraceEvent = ({
  type,
  name,
  data = {},
  metadata = {},
  parentId = null,
}) => Object.freeze({
  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type,
  name,
  data: Object.freeze({ ...data }),
  metadata: Object.freeze({ ...metadata }),
  parentId,
  timestamp: Date.now(),
  isoTimestamp: new Date().toISOString(),
});

// Trace span for tracking hierarchical operations
export const createSpan = (name, metadata = {}) => {
  const id = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  const events = [];
  
  return {
    id,
    name,
    
    // Add an event to this span
    addEvent: (event) => {
      events.push({ ...event, parentId: id });
    },
    
    // Create a child span
    createChild: (childName, childMetadata = {}) =>
      createSpan(childName, { ...childMetadata, parentSpanId: id }),
    
    // End the span and return summary
    end: (result = null, error = null) => ({
      id,
      name,
      startTime,
      endTime: Date.now(),
      duration: Date.now() - startTime,
      metadata: Object.freeze({ ...metadata }),
      result,
      error,
      events: Object.freeze([...events]),
      success: !error,
    }),
  };
};

// Tracer factory
export const createTracer = (config = {}) => {
  const {
    enabled = true,
    logger = console.log,
    filter = () => true,
    formatter = (event) => JSON.stringify(event, null, 2),
  } = config;
  
  const traces = [];
  
  return {
    // Log a trace event
    trace: (event) => {
      if (!enabled || !filter(event)) return;
      
      traces.push(event);
      logger(formatter(event));
    },
    
    // Create a traced function
    traced: (name, fn) => async (...args) => {
      const span = createSpan(name, { args });
      const startEvent = createTraceEvent({
        type: TraceEventType.CUSTOM,
        name: `${name}_start`,
        data: { args },
      });
      
      traces.push(startEvent);
      logger(formatter(startEvent));
      
      try {
        const result = await fn(...args);
        const endEvent = createTraceEvent({
          type: TraceEventType.CUSTOM,
          name: `${name}_end`,
          data: { result },
          metadata: { duration: Date.now() - startEvent.timestamp },
        });
        
        traces.push(endEvent);
        logger(formatter(endEvent));
        
        return result;
      } catch (error) {
        const errorEvent = createTraceEvent({
          type: TraceEventType.ERROR,
          name: `${name}_error`,
          data: { error: error.message },
          metadata: { duration: Date.now() - startEvent.timestamp },
        });
        
        traces.push(errorEvent);
        logger(formatter(errorEvent));
        
        throw error;
      }
    },
    
    // Get all traces
    getTraces: () => Object.freeze([...traces]),
    
    // Clear traces
    clear: () => {
      traces.length = 0;
    },
    
    // Create a new tracer with updated config
    withConfig: (newConfig) => createTracer({ ...config, ...newConfig }),
  };
};

// Middleware to add tracing to agents
export const withTracing = (agent, tracer = createTracer()) => ({
  ...agent,
  process: tracer.traced(`agent_${agent.name}`, agent.process),
});

// Middleware to add tracing to tools
export const withToolTracing = (tool, tracer = createTracer()) => ({
  ...tool,
  execute: tracer.traced(`tool_${tool.name}`, tool.execute),
});

// Create a trace aggregator for analyzing traces
export const createTraceAggregator = () => {
  const aggregations = new Map();
  
  return {
    // Add traces to aggregation
    aggregate: (traces) => {
      for (const trace of traces) {
        const key = `${trace.type}:${trace.name}`;
        const existing = aggregations.get(key) || {
          count: 0,
          totalDuration: 0,
          errors: 0,
          minDuration: Infinity,
          maxDuration: 0,
        };
        
        const duration = trace.metadata?.duration || 0;
        
        aggregations.set(key, {
          count: existing.count + 1,
          totalDuration: existing.totalDuration + duration,
          errors: existing.errors + (trace.type === TraceEventType.ERROR ? 1 : 0),
          minDuration: Math.min(existing.minDuration, duration),
          maxDuration: Math.max(existing.maxDuration, duration),
        });
      }
    },
    
    // Get aggregated statistics
    getStats: () => {
      const stats = {};
      
      for (const [key, data] of aggregations) {
        stats[key] = {
          ...data,
          avgDuration: data.totalDuration / data.count,
          errorRate: data.errors / data.count,
        };
      }
      
      return Object.freeze(stats);
    },
    
    // Reset aggregations
    reset: () => {
      aggregations.clear();
    },
  };
};

// Create a structured logger
export const createLogger = (config = {}) => {
  const {
    level = 'info',
    prefix = '',
    format = 'json',
    output = console.log,
  } = config;
  
  const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };
  
  const levelValue = levels[level] || 1;
  
  const formatters = {
    json: (level, message, data) => JSON.stringify({
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      prefix,
    }),
    text: (level, message, data) => 
      `[${new Date().toISOString()}] ${prefix}${level.toUpperCase()}: ${message} ${
        data ? JSON.stringify(data) : ''
      }`,
  };
  
  const formatter = formatters[format] || formatters.json;
  
  const log = (logLevel) => (message, data = null) => {
    if (levels[logLevel] >= levelValue) {
      output(formatter(logLevel, message, data));
    }
  };
  
  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    
    // Create a child logger with additional context
    child: (childConfig) => createLogger({ ...config, ...childConfig }),
  };
};

// Performance monitor
export const createPerformanceMonitor = () => {
  const metrics = new Map();
  
  return {
    // Start timing an operation
    start: (name) => {
      const startTime = performance.now();
      return {
        end: () => {
          const duration = performance.now() - startTime;
          const existing = metrics.get(name) || [];
          existing.push(duration);
          metrics.set(name, existing);
          return duration;
        },
      };
    },
    
    // Get metrics for an operation
    getMetrics: (name) => {
      const durations = metrics.get(name) || [];
      if (durations.length === 0) return null;
      
      const sorted = [...durations].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      
      return {
        count: sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: sum / sorted.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    },
    
    // Clear metrics
    clear: (name = null) => {
      if (name) {
        metrics.delete(name);
      } else {
        metrics.clear();
      }
    },
  };
};

// Trace exporter for different formats
export const createTraceExporter = (format = 'json') => {
  const exporters = {
    json: (traces) => JSON.stringify(traces, null, 2),
    
    csv: (traces) => {
      const headers = ['id', 'type', 'name', 'timestamp', 'duration', 'parentId'];
      const rows = traces.map(trace => [
        trace.id,
        trace.type,
        trace.name,
        trace.isoTimestamp,
        trace.metadata?.duration || '',
        trace.parentId || '',
      ]);
      
      return [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    },
    
    opentelemetry: (traces) => ({
      resourceSpans: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'agent-sdk' } },
          ],
        },
        scopeSpans: [{
          scope: { name: 'agent-tracer' },
          spans: traces.map(trace => ({
            traceId: trace.id,
            spanId: trace.id,
            parentSpanId: trace.parentId,
            name: trace.name,
            kind: 'SPAN_KIND_INTERNAL',
            startTimeUnixNano: trace.timestamp * 1000000,
            endTimeUnixNano: (trace.timestamp + (trace.metadata?.duration || 0)) * 1000000,
            attributes: Object.entries(trace.data || {}).map(([k, v]) => ({
              key: k,
              value: { stringValue: String(v) },
            })),
          })),
        }],
      }],
    }),
  };
  
  return {
    export: (traces) => exporters[format](traces),
  };
};