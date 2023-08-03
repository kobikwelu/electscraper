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
    let url = await this.convertToHyphenatedLowercase(title)

    let query = {$or: [{_id: id}, {url: url}]};
    let newArticleList = []
    let post = {
        article: '',
        linkedArticles: []
    }

    if (title || id) {
        try {
            let blog = await Post.findOne(query)
            post.article = blog
            const posts = await Post.find({category: new RegExp(blog.category, 'i')})
                .sort({timestamp: -1})
                .exec();

            post.linkedArticles = await buildArticlesArray(newArticleList, posts)

            res.status(200);
            res.json({
                post
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
            message: "Missing required values. One of title or id is required"
        })
    }

};

exports.getPosts = async (req, res) => {
    const page = req.headers['page'];
    const category = req.headers['category'];
    const size = parseInt(req.headers['size'])
    let posts
    let query

    if (page && size) {
        try {
            if (category) {
                query = {category: new RegExp(category, 'i')};
            } else {
                query = {};
            }
            posts = await Post.find(query)
                .sort({timestamp: -1})  // Sorting in descending order by timestamp
                .skip(size * (page - 1))   // Skip the pages before the current one
                .limit(size)               // Limit the result to the 'size' posts per page
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

exports.persistPostInDBAndCache = async (title, content, image, thumbnail, category, author) => {
    try {
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
    } catch (error) {
        logger.info(error)
    }
}

const buildArticlesArray = async (newArray, array) => {
    for (let i = 0; i < 3; i++) {  // Loop for 3 times
        if (array.length > 0) {  // Check if array still has elements
            let randomIndex = Math.floor(Math.random() * array.length);  // Generate a random index
            let removedItems = array.splice(randomIndex, 1);  // Remove an element from the array
            newArray.push(removedItems[0]);  // Add the removed element to the new array
        } else {
            logger.info("No more items to pick from!");
            break;
        }
    }
    return newArray
}

exports.convertToHyphenatedLowercase = async (inputString) => {
    return inputString.toLowerCase().replace(/ /g, '-');
}
