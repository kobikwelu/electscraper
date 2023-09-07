

const express = require('express');
const router = express.Router();

const { postController }  = require('../../../controllers');
const upload = require('../../../middlewares/upload');
const {checkJwt} = require("../../../middlewares/checkJwt");

//section below


/*
* *********************************GET*****************************************
*/


router.get('/post', postController.getPost);

router.patch('/post', [checkJwt, upload.upload.array('image')], postController.editPost);

router.delete('/post', [checkJwt, upload.upload.array('image')], postController.deletePost);

router.get('/posts', postController.getPosts);

router.get('/post/categories', checkJwt, postController.getCategories);

router.post('/post', [checkJwt, upload.upload.array('image')], postController.createPost);

module.exports = router;