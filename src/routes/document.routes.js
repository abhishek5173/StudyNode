const express = require('express');
const auth = require('../middleware/auth.middleware');
const {
    createDocument,
    getDocuments,
    getDocumentById,
    updateDocument,
    deleteDocument
} = require('../controllers/document.controllers');

const router = express.Router();

router.use(auth);

router.post('/', createDocument);
router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

module.exports = router;