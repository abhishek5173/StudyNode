const moongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new moongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
)

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.passwordHash);
}

module.exports = moongoose.model('User', userSchema);