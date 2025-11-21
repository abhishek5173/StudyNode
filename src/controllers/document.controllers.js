const Document = require('../models/Document');

exports.createDocument = async (req, res) => {
    try {
        const doc = await Document.create({
            title: req.body.title || 'Untitled Document',
            content: {},
            owner: req.user.id,
        });
        res.json(doc);
    } catch (error) {
        
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

exports.getDocuments = async (req, res) => {
    try {
        const docs = await Document.find({ owner: req.user.id }).sort({ updatedAt: -1 });
        res.json(docs);
    } catch (error) {
       
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

exports.getDocumentById = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc || doc.owner.toString() !== req.user.id.toString()) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.json(doc);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

exports.updateDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc || doc.owner.toString() !== req.user.id.toString()) {
            return res.status(404).json({ message: 'Document not found' });
        }
        if (req.body.title) doc.title = req.body.title;
        if (req.body.content) doc.content = req.body.content;
        await doc.save();
        res.json(doc);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

exports.deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc || doc.owner.toString() !== req.user.id.toString()) {
            return res.status(404).json({ message: 'Document not found' });
        }
        await doc.deleteOne();
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}