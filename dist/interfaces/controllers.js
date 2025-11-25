/**
 * Controller Interfaces
 * Интерфейсы для всех контроллеров
 */
// Базовый класс для всех контроллеров
export class BaseControllerClass {
    handleError(error, req, res, next) {
        console.error(`Controller Error [${req.method} ${req.path}]:`, error);
        if (req.accepts('json')) {
            res.status(500).json({
                success: false,
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        }
        else {
            res.status(500).render('error', {
                error: {
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                }
            });
        }
    }
    handleSuccess(data, req, res, message) {
        if (req.accepts('json')) {
            res.json({
                success: true,
                data,
                message
            });
        }
        else {
            res.render('success', { data, message });
        }
    }
    handleValidationError(errors, req, res) {
        if (req.accepts('json')) {
            res.status(400).json({
                success: false,
                error: 'Validation Error',
                details: errors
            });
        }
        else {
            res.status(400).render('validation-error', { errors });
        }
    }
}
