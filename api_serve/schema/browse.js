
const Joi = require('joi')
exports.add_history_schema = Joi.object({
  target_type: Joi.string()
    .valid('post', 'subreddit')
    .required(),
  target_id: Joi.number()
    .integer()
    .min(1)
    .required()
})

exports.delete_history_schema = Joi.object({
  target_type: Joi.string()
    .valid('post', 'subreddit')
    .required(),
  target_id: Joi.number()
    .integer()
    .min(1)
    .required()
})

