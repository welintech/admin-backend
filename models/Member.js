const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    memberNumber: {
        type: String,
        required: true
    },
    dob: {
        type: Date,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    memberName: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    sumInsured: {
        type: Number,
        required: true
    },
    relationship: {
        type: String,
        required: true
    },
    policyStartDate: {
        type: Date,
        required: true
    },
    policyEndDate: {
        type: Date,
        required: true
    },
    maritalStatus: {
        type: String,
        required: true
    },
    premiumWithoutGst: {
        type: Number,
        required: true
    },
    premiumWithGst: {
        type: Number,
        required: true
    },
    hasHypertension: {
        type: String,
        required: true
    },
    hypertensionYears: {
        type: String
    },
    hasDiabetes: {
        type: String,
        required: true
    },
    diabetesYears: {
        type: String
    },
    hasHeartDisease: {
        type: String,
        required: true
    },
    heartDiseaseYears: {
        type: String
    },
    hasCancer: {
        type: String,
        required: true
    },
    cancerYears: {
        type: String
    },
    hasKidneyDisease: {
        type: String,
        required: true
    },
    kidneyDiseaseYears: {
        type: String
    },
    nomineeName: {
        type: String,
        required: true
    },
    nomineeAge: {
        type: String,
        required: true
    },
    nomineeRelationship: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Member', memberSchema); 