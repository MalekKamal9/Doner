const cds = require('@sap/cds');
const { v4: uuidv4 } = require('uuid');

module.exports = async function (request, next) {
    const { Donors, DonorTypes } = cds.entities('donor_management_BitaSrv');
    const { data } = request;

    // ========== DETERMINE IF CREATE OR UPDATE ==========
    const isUpdate = request.event === 'UPDATE';
    const donorID = isUpdate ? request.params[0]?.ID || request.params[0] : data.donorID;

    // ========== AUTO-GENERATE DONOR ID (CREATE ONLY) ==========
    if (!isUpdate && !data.donorID) {
        data.donorID = uuidv4();
    }

    // ========== VALIDATION ==========

    // Validate name
    if (data.name !== undefined) {
        if (!data.name || String(data.name).trim().length < 2) {
            return request.error(400, 'Name must be at least 2 characters long.', 'name');
        }
    } else if (!isUpdate) {
        return request.error(400, 'Name is required.', 'name');
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email !== undefined) {
        const emailValue = String(data.email).trim();
        
        if (!emailValue) {
            return request.error(400, 'Email is required.', 'email');
        }
        
        if (!emailPattern.test(emailValue)) {
            return request.error(400, 'Please enter a valid email address (e.g., user@example.com).', 'email');
        }

        // Normalize email
        data.email = emailValue.toLowerCase();

        // Check duplicate email (exclude current donor during update)
        let existingDonor;
        if (isUpdate && donorID) {
            existingDonor = await SELECT.one.from(Donors).where({ email: data.email, ID: { '!=': donorID } });
        } else {
            existingDonor = await SELECT.one.from(Donors).where({ email: data.email });
        }
        
        if (existingDonor) {
            return request.error(409, 'A donor with this email already exists.', 'email');
        }
    } else if (!isUpdate) {
        return request.error(400, 'Email is required.', 'email');
    }

    // Validate phone (if provided)
    if (data.phone !== undefined && data.phone !== null) {
        const phoneValue = String(data.phone).trim();
        
        if (phoneValue !== '') {
            // Remove all non-digit characters for validation
            const digitsOnly = phoneValue.replace(/\D/g, '');
            
            if (digitsOnly.length < 10 || digitsOnly.length > 15) {
                return request.error(400, 'Phone number must contain 10-15 digits.', 'phone');
            }
            
            // Check if it contains only valid phone characters
            const validPhonePattern = /^[\d\s\-\+\(\)]+$/;
            if (!validPhonePattern.test(phoneValue)) {
                return request.error(400, 'Phone number can only contain digits, spaces, and symbols (+ - ( )).', 'phone');
            }
        }
    }

    // ========== SET DEFAULTS (primarily for CREATE) ==========

    if (data.status !== undefined) {
        if (typeof data.status === 'string') {
            data.status = data.status.toLowerCase() === 'true' || 
                          data.status.toLowerCase() === 'active' || 
                          data.status === '1';
        } else {
            data.status = Boolean(data.status);
        }
    } else if (!isUpdate) {
        data.status = true;
    }

    if (data.isRecurringDonor !== undefined) {
        data.isRecurringDonor = Boolean(data.isRecurringDonor);
    } else if (!isUpdate) {
        data.isRecurringDonor = false;
    }

    if (data.isHNI !== undefined) {
        data.isHNI = Boolean(data.isHNI);
    } else if (!isUpdate) {
        data.isHNI = false;
    }

    // Validate donorType if provided
    if (data.donorType_ID) {
        const donorType = await SELECT.one.from(DonorTypes).where({ ID: data.donorType_ID });
        if (!donorType) {
            return request.error(400, 'Invalid Donor Type.', 'donorType_ID');
        }
    }

    console.log(`${isUpdate ? 'Updating' : 'Creating'} Donor:`, donorID || data.donorID, data.name, data.email);

    return next();
};