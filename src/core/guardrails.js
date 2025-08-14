/**
 * Guardrails Module
 * Functional approach to input/output validation and safety checks
 */

// Validation result types
export const ValidationResult = {
  valid: (value, metadata = {}) => ({
    isValid: true,
    value,
    metadata: Object.freeze({ ...metadata }),
  }),
  
  invalid: (errors, value = null, metadata = {}) => ({
    isValid: false,
    errors: Array.isArray(errors) ? Object.freeze([...errors]) : Object.freeze([errors]),
    value,
    metadata: Object.freeze({ ...metadata }),
  }),
};

// Core validator type - a function that returns a ValidationResult
export const createValidator = (validationFn, name = 'anonymous') => {
  const validator = (value) => {
    try {
      return validationFn(value);
    } catch (error) {
      return ValidationResult.invalid(
        `Validator ${name} threw error: ${error.message}`,
        value
      );
    }
  };
  
  validator.validatorName = name;
  return validator;
};

// Combinator functions for validators
export const compose = (...validators) =>
  createValidator((value) => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.isValid) {
        return result;
      }
    }
    return ValidationResult.valid(value);
  }, 'composed');

export const any = (...validators) =>
  createValidator((value) => {
    const errors = [];
    
    for (const validator of validators) {
      const result = validator(value);
      if (result.isValid) {
        return result;
      }
      errors.push(...result.errors);
    }
    
    return ValidationResult.invalid(errors, value);
  }, 'any');

export const all = (...validators) =>
  createValidator((value) => {
    const errors = [];
    let hasError = false;
    
    for (const validator of validators) {
      const result = validator(value);
      if (!result.isValid) {
        hasError = true;
        errors.push(...result.errors);
      }
    }
    
    return hasError 
      ? ValidationResult.invalid(errors, value)
      : ValidationResult.valid(value);
  }, 'all');

// Common validators
export const validators = {
  required: createValidator(
    (value) => 
      value !== null && value !== undefined && value !== ''
        ? ValidationResult.valid(value)
        : ValidationResult.invalid('Value is required', value),
    'required'
  ),
  
  minLength: (min) => createValidator(
    (value) =>
      String(value).length >= min
        ? ValidationResult.valid(value)
        : ValidationResult.invalid(`Minimum length is ${min}`, value),
    `minLength(${min})`
  ),
  
  maxLength: (max) => createValidator(
    (value) =>
      String(value).length <= max
        ? ValidationResult.valid(value)
        : ValidationResult.invalid(`Maximum length is ${max}`, value),
    `maxLength(${max})`
  ),
  
  pattern: (regex, message = 'Invalid format') => createValidator(
    (value) =>
      regex.test(String(value))
        ? ValidationResult.valid(value)
        : ValidationResult.invalid(message, value),
    `pattern(${regex})`
  ),
  
  custom: (fn, name = 'custom') => createValidator(fn, name),
  
  // Content validators
  noPersonalInfo: createValidator(
    (value) => {
      const text = String(value);
      const patterns = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /\b\d{16}\b/, // Credit card
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email
        /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return ValidationResult.invalid('Contains potential personal information', value);
        }
      }
      
      return ValidationResult.valid(value);
    },
    'noPersonalInfo'
  ),
  
  safeContent: createValidator(
    (value) => {
      const text = String(value).toLowerCase();
      const harmfulPatterns = [
        /\b(hack|exploit|injection|malware)\b/,
        /<script[^>]*>|<\/script>/,
        /\bexec\s*\(/,
      ];
      
      for (const pattern of harmfulPatterns) {
        if (pattern.test(text)) {
          return ValidationResult.invalid('Contains potentially harmful content', value);
        }
      }
      
      return ValidationResult.valid(value);
    },
    'safeContent'
  ),
};

// Guardrail factory - creates a guardrail with input/output validators
export const createGuardrail = ({
  name,
  inputValidator = () => ValidationResult.valid(true),
  outputValidator = () => ValidationResult.valid(true),
  onInputError = null,
  onOutputError = null,
}) => ({
  name,
  
  // Validate input
  validateInput: (input) => {
    const result = inputValidator(input);
    if (!result.isValid && onInputError) {
      onInputError(result);
    }
    return result;
  },
  
  // Validate output
  validateOutput: (output) => {
    const result = outputValidator(output);
    if (!result.isValid && onOutputError) {
      onOutputError(result);
    }
    return result;
  },
  
  // Wrap a function with validation
  protect: (fn) => async (...args) => {
    // Validate inputs
    const inputResults = args.map((arg, index) => ({
      index,
      result: inputValidator(arg),
    }));
    
    const invalidInputs = inputResults.filter(r => !r.result.isValid);
    if (invalidInputs.length > 0) {
      const error = new Error('Input validation failed');
      error.validationErrors = invalidInputs;
      throw error;
    }
    
    // Execute function
    const output = await fn(...args);
    
    // Validate output
    const outputResult = outputValidator(output);
    if (!outputResult.isValid) {
      const error = new Error('Output validation failed');
      error.validationErrors = outputResult.errors;
      error.output = output;
      throw error;
    }
    
    return output;
  },
  
  // Create a new guardrail with additional validators
  withInputValidator: (newValidator) =>
    createGuardrail({
      name,
      inputValidator: compose(inputValidator, newValidator),
      outputValidator,
      onInputError,
      onOutputError,
    }),
    
  withOutputValidator: (newValidator) =>
    createGuardrail({
      name,
      inputValidator,
      outputValidator: compose(outputValidator, newValidator),
      onInputError,
      onOutputError,
    }),
});

// Higher-order function to apply guardrails to an agent
export const withGuardrails = (agent, guardrail) => ({
  ...agent,
  process: guardrail.protect(agent.process),
});

// Create a guardrail chain - validates through multiple guardrails
export const createGuardrailChain = (...guardrails) => ({
  validate: (value, type = 'input') => {
    const results = [];
    
    for (const guardrail of guardrails) {
      const validator = type === 'input' 
        ? guardrail.validateInput 
        : guardrail.validateOutput;
        
      const result = validator(value);
      results.push({
        guardrail: guardrail.name,
        result,
      });
      
      if (!result.isValid) {
        return {
          isValid: false,
          failedAt: guardrail.name,
          results: Object.freeze(results),
        };
      }
    }
    
    return {
      isValid: true,
      results: Object.freeze(results),
    };
  },
  
  // Add a guardrail to the chain
  withGuardrail: (guardrail) =>
    createGuardrailChain(...guardrails, guardrail),
});

// Utility to create conditional guardrails
export const conditionalGuardrail = (condition, guardrail) => ({
  ...guardrail,
  validateInput: (input) =>
    condition(input) ? guardrail.validateInput(input) : ValidationResult.valid(input),
  validateOutput: (output) =>
    condition(output) ? guardrail.validateOutput(output) : ValidationResult.valid(output),
});

// Rate limiting guardrail
export const createRateLimiter = (maxCalls, windowMs) => {
  const calls = new Map();
  
  return createGuardrail({
    name: 'rateLimiter',
    inputValidator: (input) => {
      const now = Date.now();
      const key = JSON.stringify(input);
      const callTimes = calls.get(key) || [];
      
      // Remove old calls outside the window
      const recentCalls = callTimes.filter(time => now - time < windowMs);
      
      if (recentCalls.length >= maxCalls) {
        return ValidationResult.invalid(
          `Rate limit exceeded: ${maxCalls} calls per ${windowMs}ms`,
          input
        );
      }
      
      // Update calls
      calls.set(key, [...recentCalls, now]);
      
      return ValidationResult.valid(input);
    },
  });
};