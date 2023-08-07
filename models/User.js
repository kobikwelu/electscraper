const mongoose = require('mongoose');
const db = require('../dbConnect').get();


const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    role: String,
    tier: {
        type: String,
        required: [true, 'account tier is required - it must be BASIC_UNREGISTERED | BASIC_REGISTERED | TEAM | ENTERPRISE'],
        validate: [{
            validator: (value) => {
                const tierRegex = /\b(?:BASIC_UNREGISTERED|BASIC_REGISTERED|TEAM|ENTERPRISE)\b/
                return tierRegex.test(value);
            },
            message: props => `${props.value} is not a valid account tier - it must be basic | team | enterprise`
        }]
    },
    subscriptionPlan: {
        dollarCost: Number,
        autoRenewal: Boolean,
        expiryDate: Date,
        name: String
    },
    profile: {
        address: {
            type: String,
            default: ''
        },
        zipcode: {
            type: String,
            default: ''
        },
        phoneNumber: {
            type: String,
            default: ''
        },
        profileImageUrl: {
            type: String,
            default: ''
        },
        bioInfo: {
            type: String,
            default: ''
        },
        dateOfBirth: {
            type: String,
            default: ''
        },
        isNewAdvisoryNeeded: {
            type: Boolean,
            default: true,
        },
        financialQuestionnaires: [{
                question: { type: String, required: true },
                answer: { type: String, required: true },
            }],
        comments: [{
            text: String,
            images: [""],
            createdAt: {
                type: Date,
                default: Date.now
            }
        }]
    },
    emailActivationToken: String,
    emailActivationTokenExpiryDate: Date,
    email: {
        type: String,
        required: [true, 'Email is required'],
        validate: [
            {
                validator: (value) => {
                    const emailRegex = /([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|"([]!#-[^-~ \t]|(\\[\t -~]))+")@([0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)*|\[((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|IPv6:((((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){6}|::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){5}|[0-9A-Fa-f]{0,4}::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){4}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):)?(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){3}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,2}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){2}|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,3}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,4}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::)((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3})|(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3})|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,5}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3})|(((0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}):){0,6}(0|[1-9A-Fa-f][0-9A-Fa-f]{0,3}))?::)|(?!IPv6:)[0-9A-Za-z-]*[0-9A-Za-z]:[!-Z^-~]+)])/;
                    return emailRegex.test(value);
                },
                message: props => `${props.value} is not a valid email address!`,
            },
        ],
    },
    isEmailConfirmed: {
        type: Boolean,
        default: false,
    },
    isGoogleAuth: {
        type: Boolean,
        default: false,
    },
    isAccountActive: {
        type: Boolean,
        default: false,
    },
    showChangePasswordGate: {
        type: Boolean,
        default: false,
    },
    accountState: {
        disabled: {
            isDisabled: {
                type: Boolean,
                default: false,
            },
            reasons: [{
                code: String,
                description: String
            }]
        }
    },
    temporaryPassword: {
        type: String,
        default: null,
    },
    lastCheckInTime: Date,
    dailyCounter: Number,
    registrationDate: Date
});

userSchema.pre('save', function (next) {
    if (this.isNew) {
        this.registrationDate = new Date();
        this.lastCheckInTime = new Date();
        this.dailyCounter = 0;
        this.markModified('registrationDate');
        this.markModified('lastCheckInTime');
        this.markModified('dailyCounter');
    }
    next();
});

userSchema.query.byEmail = function (email) {
    return this.where({email});
};


const User = db.model('User', userSchema);

module.exports = User;