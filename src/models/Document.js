const moongoose = require('mongoose');

const documentSchema = new moongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        content: {
            type: Object,
            default: {},
        },
        owner: {
            type: moongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        collaborators: [{
            type: moongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
    },
    { timestamps: true }
);

module.exports = moongoose.model('Document', documentSchema);