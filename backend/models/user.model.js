
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({

    fullName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        default: undefined
    },

    // Mobile number is optional for Google registration
    mobile: {
        type: String,
        trim: true,
        default: undefined
    },

    // Firebase Google Authentication UID
    firebaseUid: {
        type: String,
        unique: true,
        sparse: true
    },

    // Default role for Google registration is user
    role: {
        type: String,
        enum: ['user', 'owner', 'deliveryBoy'],
        required: true,
        default: 'user'
    },

    city: {
        type: String,
        trim: true,
        default: ''
    },

    state: {
        type: String,
        trim: true,
        default: ''
    },

    resetotp: {
        type: String
    },

    isotpverified: {
        type: Boolean,
        default: false
    },

    otpExpires: {
        type: Date
    }

}, {
    timestamps: true
});

// Unique mobile number only when mobile is a string
userSchema.index(
    { mobile: 1 },
    {
        unique: true,
        partialFilterExpression: {
            mobile: { $type: 'string' }
        }
    }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
