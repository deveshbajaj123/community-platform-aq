/**
 * Standard success response
 */
const successResponse = (res, data = null, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data
  });
};

/**
 * Created response (201)
 */
const createdResponse = (res, data = null, message = 'Created successfully') => {
  return res.status(201).json({
    success: true,
    message,
    data
  });
};

/**
 * Error response
 */
const errorResponse = (res, message = 'An error occurred', statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

/**
 * Not found response
 */
const notFoundResponse = (res, resource = 'Resource') => {
  return res.status(404).json({
    success: false,
    message: `${resource} not found`
  });
};

/**
 * Forbidden response
 */
const forbiddenResponse = (res, message = 'Access forbidden') => {
  return res.status(403).json({
    success: false,
    message
  });
};

/**
 * Paginated response
 */
const paginatedResponse = (res, data, pagination) => {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);

  return res.status(200).json({
    success: true,
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
};

module.exports = {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
  paginatedResponse
};
