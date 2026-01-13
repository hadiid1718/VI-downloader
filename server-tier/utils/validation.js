const Joi = require('joi');

// URL validation schema
const urlSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'Must be a valid URL',
    'any.required': 'URL is required',
  }),
});

// Download request schema
const downloadSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'Must be a valid URL',
    'any.required': 'URL is required',
  }),
  format: Joi.string().optional().default('best'),
  priority: Joi.string().valid('low', 'normal', 'high').default('normal'),
});

// Metadata request schema
const metadataSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'Must be a valid URL',
    'any.required': 'URL is required',
  }),
});

// Job status schema
const jobStatusSchema = Joi.object({
  jobId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
});

/**
 * Validate request body
 * @param {object} data - Data to validate
 * @param {object} schema - Joi schema
 * @returns {object} Validation result
 */
function validate(data, schema) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return {
      valid: false,
      errors: error.details.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    };
  }

  return {
    valid: true,
    data: value,
  };
}

module.exports = {
  validate,
  urlSchema,
  downloadSchema,
  metadataSchema,
  jobStatusSchema,
};
