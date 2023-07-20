

const express = require('express');
const router = express.Router();

const { postController }  = require('../../../controllers');

//section below

/*
* *********************************GET*****************************************
*/


router.get('/post', postController.getPost);

router.get('/posts', postController.getPosts);

module.exports = router;