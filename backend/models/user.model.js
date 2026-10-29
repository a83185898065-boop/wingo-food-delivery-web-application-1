import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    fullName: { type: String, 
                 required: true 
                
    },
    email: { type: String, 
             required: true,    
                unique: true    
            },
    password: { type: String, 
                
            },
    mobile: { type: String,
              required: true,
              unique: true  
            },
    role: { type: String, 
            enum: ['user', 'owner', 'deliveryBoy'],    
            required: true,            
            default: 'user'
    },
    city: {
        type: String,
        trim: true,
        default: '',
    },
    state: {
        type: String,
        trim: true,
        default: '',
    },
    resetotp: 
          { type: String },

    isotpverified: 
          { type: Boolean, 
          default: false },
          
    otpExpires:
          { type: Date },


 }, {timestamps: true});
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
