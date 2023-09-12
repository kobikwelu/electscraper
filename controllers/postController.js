const Post = require('../models/Post');
const Category = require('../models/Category');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config')
const { s3Client } = require('../middlewares/upload');

exports.createPost = async (req, res) => {
    const { title, content, category, author, imageCopyright, isBreakingNews } = req.body;

    // Trim any spaces at the end of the title
    const trimmedTitle = title ? title.trimEnd() : null;

    if (trimmedTitle && content && category && author && isBreakingNews && imageCopyright && req.files) {
        try {
            let image = req.files.find(file => file.fieldname === 'image').location;
            let url = await this.convertToHyphenatedLowercase(trimmedTitle);
            await this.persistPostInDBAndCache(trimmedTitle, content, image, category, author, url, imageCopyright, isBreakingNews);
            res.status(200);
            res.json({
                message: 'success'
            });
        } catch (error) {
            res.status(500);
            res.json({
                message: "something went wrong"
            });
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values"
        });
    }
};

exports.getPost = async (req, res) => {
    const id = req.headers['id'];
    const title = req.headers['title'];
    // Trim any spaces at the end of the title
    const trimmedTitle = title ? title.trimEnd() : null;
    let url = await this.convertToHyphenatedLowercase(trimmedTitle)

    let query = {$or: [{_id: id}, {url: url}]};
    let newArticleList = []
    let post = {
        article: '',
        linkedArticles: []
    }

    if (trimmedTitle || id) {
        try {
            let blog = await Post.findOne(query)
            if (blog){
                post.article = blog
                const posts = await Post.find({category: new RegExp(blog.category, 'i')})
                    .sort({timestamp: -1})
                    .exec();

                post.linkedArticles = await buildArticlesArray(newArticleList, posts)

                res.status(200);
                res.json({
                    post
                })
            } else {
                res.status(200);
                res.json({
                    message: "Article does not exist"
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

exports.editPost = async (req, res) => {
    const { _id, title, content, category, author, imageCopyright, isBreakingNews } = req.body;
    const trimmedTitle = title ? title.trimEnd() : null;
    let url = await this.convertToHyphenatedLowercase(trimmedTitle);

    if (_id && trimmedTitle) {
        try {
            const post = await Post.findById(_id);
            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }

            let updateData = {
                title: trimmedTitle,
                content,
                category,
                url,
                author,
                imageCopyright,
                isBreakingNews  // Directly using as a boolean
            };

            // If a new image is provided
            if (req.files && req.files.length > 0) {
                // Delete the old image from S3 if it exists
                if (post.image) {
                    const oldImageKey = post.image.split('/').pop();
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: config.aws.AWS_BUCKET,
                        Key: oldImageKey
                    }));
                }

                // Upload the new image to S3
                let newImage = req.files.find(file => file.fieldname === 'image');
                if (newImage) {
                    updateData.image = newImage.location;
                }
            }

            // Update the post in the database
            const updatedPost = await Post.findByIdAndUpdate(_id, updateData, { new: true });
            res.status(200);
            res.json({
                updatedPost
            });
        } catch (error) {
            logger.error(error); // Uncomment this if logger is defined in your project
            res.status(500);
            res.json({
                message: "something went wrong"
            });
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values. Id and title are required"
        });
    }
};


exports.deletePost = async (req, res) => {
    const { _id } = req.body;

    if ( _id ) {
        try {
            const post = await Post.findById(_id);
            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }
            await Post.findByIdAndDelete(_id);
            res.status(200);
            res.json({
                message: 'Post deleted successfully'
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
            message: "Missing required values. Id is required"
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

exports.getCategories = async (req, res) => {
    try {
        let categories = await Category.find({})
            .select('-_id')
            .exec()
        res.status(200);
        res.json({
            categories
        })
    } catch (error) {
        logger.error(error)
        res.status(500);
        res.json({
            message: "something went wrong"
        })
    }
};

exports.persistPostInDBAndCache = async (title, content, image, category, author, url, imageCopyright, isBreakingNews = false) => {
    try {
        const postObject = await Post.create({
            title,
            content,
            image,
            category,
            author,
            url,
            imageCopyright,
            isBreakingNews
        })
        let postUpdate = await postObject.save();
        logger.info(`post ${postUpdate._id} saved in the DB successfully`)
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
