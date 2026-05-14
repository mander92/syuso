const errorController = (err, req, res, next) => {
    console.error(err);

    res.status(err.httpStatus || 500).send({
        status: 'error',
        message: err.message,
        code: err.code,
        details: err.details,
    });
};

export default errorController;
