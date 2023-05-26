exports.return200 = async (req, res) => {
    const now = new Date().toISOString();
    res.status(200);
    res.json({
        message: `Recommendation service is up as at ${now}`
    });
};