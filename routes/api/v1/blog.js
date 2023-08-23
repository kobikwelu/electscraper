

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

router.get('/posts', postController.getPosts);

router.post('/post', [checkJwt, upload.array('image')], postController.createPost);

module.exports = router;