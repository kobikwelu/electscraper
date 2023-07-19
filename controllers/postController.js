const Post = require('../models/Post');

exports.createPost = async (req, res) => {
    const {title, content, category, author} = req.body
    if (title && content && req.files) {
        try {
            let image = req.files.find(file => file.fieldname === 'image').location;
            let thumbnail = req.files.find(file => file.fieldname === 'thumbnail').location
            let postUpdate = await this.persistPostInDBAndCache(title, content, image, thumbnail, category, author)
            res.status(200);
            res.json({
                message: postUpdate._id
            })
        } catch (error) {
            logger.error(error)
            if (error.message.includes('Cannot read property')) {
                logger.warn('caching process failed')
                res.status(200);
                res.json({
                    result: result
                })
            } else {
                res.status(500);
                res.json({
                    message: "something went wrong"
                })
            }
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values"
        })
    }

};

exports.getPost = async (req, res) => {
   const id = req.headers['id'];
    const title = req.headers['title'];
    let query = {$or: [{_id: id}, {title: title}]};

    if (title || id) {
        try {
            if (id) {
                logger.info(` searching for post ${id} in the cache`)
                let postKey = id + 'blogpost'
                let post = JSON.parse(await redisClient.get(postKey))
                logger.info(`post ${id} found in the cache`)
                res.status(200);
                res.json({
                    post
                })
            } else {
                logger.info(` searching for title ${title} in the db`)
                let blog = Post.findOne(query)
                logger.info(` ${title} found`)
                res.status(200);
                res.json({
                    blog
                })
            }
        } catch (error) {
            logger.error(error)
            res.status(500);
            res.json({
                message: "something went wrong"
            })
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values. One of title or id is required"
        })
    }

};

exports.getPosts = async (req, res) => {
    const page = req.headers['page'];
    const size = parseInt(req.headers['size'])

    if (page && size) {
        try {
            const posts = await Post.find()
                .sort({timestamp: -1})  // sorting in descending order by timestamp
                .skip(size * (page - 1))   // skip the pages before the current one
                .limit(size)               // limit the result to 20 posts per page
                .exec();

            res.status(200);
            res.json({
                posts
            })
        } catch (error) {
            logger.error(error)
            res.status(500);
            res.json({
                message: "something went wrong"
            })
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values."
        })
    }

};

exports.persistPostInDBAndCache = async (title, content, image, thumbnail, category, author)=>{
    try{
        const postObject = await Post.create({
            title,
            content,
            image,
            thumbnail,
            category,
            author,
            timestamp: new Date()
        })
        let postUpdate = await postObject.save();
        logger.info(`post ${postUpdate._id} saved in the DB successfully`)
        logger.info(`post ${postUpdate._id} saving to cache`)
        let postKey = postUpdate._id + 'blogpost'
        await redisClient.set(postKey, JSON.stringify({
            title,
            content,
            image: image,
            thumbnail: thumbnail,
            category,
            author,
            timestamp: new Date()
        }), {
            ex: 120,
            NX: true
        })
        logger.info(`post ${postUpdate._id} successfully saved to cache`)
    } catch(error){
        logger.info(error)
    }
}