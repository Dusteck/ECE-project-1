const express = require('express');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware with JSON body size limit for security
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../client')));

// File-based data store using lowdb
const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

// Database initialization
db.defaults({
    courses: [],
    members: [],
    signupSheets: [],
    slots: [],
    signups: [],
    grades: []
}).write();

// Counter for unique IDs
let signupSheetIdCounter = db.get('signupSheets').size().value() || 0;
let slotIdCounter = db.get('slots').size().value() || 0;

const sanitizeConfig = {
    allowedTags: [],        // No HTML tags allowed
    allowedAttributes: {},  // No attributes allowed
    disallowedTagsMode: 'recursiveEscape'
};

// Sanitize text input
function sanitizeText(text) {
    if (typeof text !== 'string') return text;
    // Remove all HTML, CSS, and JavaScript
    return sanitizeHtml(text, sanitizeConfig).trim();
}

// Input validation
function validateTermCode(termCode, required = true) {
    if (termCode === undefined || termCode === null || termCode === '') {
        if (required) {
            return { valid: false, error: 'Term code cannot be blank' };
        }
        return { valid: true, value: 0 };
    }
    const term = parseInt(termCode);
    if (isNaN(term) || term < 1 || term > 9999) {
        return { valid: false, error: 'Term code must be a number between 1 and 9999' };
    }
    return { valid: true, value: term };
}

function validateSection(section, required = false) {
    if (section === undefined || section === null || section === '') {
        return { valid: true, value: required ? null : 1 };
    }
    const sec = parseInt(section);
    if (isNaN(sec) || sec < 1 || sec > 99) {
        return { valid: false, error: 'Section must be a number between 1 and 99' };
    }
    return { valid: true, value: sec };
}

function validateCourseName(courseName, required = true) {
    if (courseName === undefined || courseName === null || courseName === '') {
        if (required) {
            return { valid: false, error: 'Course name cannot be blank' };
        }
        return { valid: true, value: '' };
    }
    if (typeof courseName !== 'string') {
        return { valid: false, error: 'Course name must be a string' };
    }
    // Sanitize to prevent HTML/JS injection
    const sanitized = sanitizeText(courseName);
    const truncated = sanitized.substring(0, 100);
    return { valid: true, value: truncated };
}

function validateMemberId(memberId) {
    if (!memberId || typeof memberId !== 'string') {
        return { valid: false, error: 'Member ID cannot be blank and must be a string' };
    }
    // Sanitize to prevent HTML/JS injection
    const sanitized = sanitizeText(memberId);
    const truncated = sanitized.substring(0, 8);
    return { valid: true, value: truncated };
}

function validateName(name, fieldName, required = true) {
    if (name === undefined || name === null || name === '') {
        if (required) {
            return { valid: false, error: `${fieldName} cannot be blank` };
        }
        return { valid: true, value: '' };
    }
    if (typeof name !== 'string') {
        return { valid: false, error: `${fieldName} must be a string` };
    }
    // Sanitize to prevent HTML/JS injection
    const sanitized = sanitizeText(name);
    const truncated = sanitized.substring(0, 200);
    return { valid: true, value: truncated };
}

function validateRole(role, required = true) {
    if (role === undefined || role === null || role === '') {
        if (required) {
            return { valid: false, error: 'Role cannot be blank' };
        }
        return { valid: true, value: '' };
    }
    if (typeof role !== 'string') {
        return { valid: false, error: 'Role must be a string' };
    }
    // Sanitize to prevent HTML/JS injection
    const sanitized = sanitizeText(role);
    const truncated = sanitized.substring(0, 10);
    return { valid: true, value: truncated };
}

// Assignment name validation
function validateAssignmentName(assignmentName, required = true) {
    if (assignmentName === undefined || assignmentName === null || assignmentName === '') {
        if (required) {
            return { valid: false, error: 'Assignment name cannot be blank' };
        }
        return { valid: true, value: '' };
    }
    if (typeof assignmentName !== 'string') {
        return { valid: false, error: 'Assignment name must be a string' };
    }
    const sanitized = sanitizeText(assignmentName);
    const truncated = sanitized.substring(0, 100);
    return { valid: true, value: truncated };
}

// Timestamp validation
function validateTimestamp(timestamp, fieldName, required = true) {
    if (timestamp === undefined || timestamp === null || timestamp === '') {
        if (required) {
            return { valid: false, error: `${fieldName} cannot be blank` };
        }
        return { valid: true, value: null };
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        return { valid: false, error: `${fieldName} must be a valid timestamp` };
    }
    return { valid: true, value: date.toISOString() };
}

// Slot duration validation
function validateSlotDuration(duration) {
    if (duration === undefined || duration === null || duration === '') {
        return { valid: false, error: 'Slot duration cannot be blank' };
    }
    const dur = parseInt(duration);
    if (isNaN(dur) || dur < 1 || dur > 240) {
        return { valid: false, error: 'Slot duration must be a number between 1 and 240 minutes' };
    }
    return { valid: true, value: dur };
}

// Slot No. validation
function validateNumSlots(numSlots) {
    if (numSlots === undefined || numSlots === null || numSlots === '') {
        return { valid: false, error: 'Number of slots cannot be blank' };
    }
    const num = parseInt(numSlots);
    if (isNaN(num) || num < 1 || num > 99) {
        return { valid: false, error: 'Number of slots must be between 1 and 99' };
    }
    return { valid: true, value: num };
}

// Max members per slot (1-99)
function validateMaxMembers(maxMembers) {
    if (maxMembers === undefined || maxMembers === null || maxMembers === '') {
        return { valid: false, error: 'Max members per slot cannot be blank' };
    }
    const max = parseInt(maxMembers);
    if (isNaN(max) || max < 1 || max > 99) {
        return { valid: false, error: 'Max members must be between 1 and 99' };
    }
    return { valid: true, value: max };
}

// Grade validation
function validateGrade(grade) {
    if (grade === undefined || grade === null || grade === '') {
        return { valid: false, error: 'Grade cannot be blank' };
    }
    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 999) {
        return { valid: false, error: 'Grade must be a number between 0 and 999' };
    }
    return { valid: true, value: gradeNum };
}

// Comment validation
function validateComment(comment, required = false) {
    if (comment === undefined || comment === null || comment === '') {
        if (required) {
            return { valid: false, error: 'Comment cannot be blank' };
        }
        return { valid: true, value: '' };
    }
    if (typeof comment !== 'string') {
        return { valid: false, error: 'Comment must be a string' };
    }
    // Sanitize to prevent HTML/JS injection
    const sanitized = sanitizeText(comment);
    const truncated = sanitized.substring(0, 500);
    return { valid: true, value: truncated };
}

// Course creation
app.post('/api/courses', (req, res) => {
    const { termCode, courseName, section } = req.body;

    // Input validation
    const termValidation = validateTermCode(termCode);
    if (!termValidation.valid) {
        return res.status(400).json({ error: termValidation.error });
    }

    const nameValidation = validateCourseName(courseName);
    if (!nameValidation.valid) {
        return res.status(400).json({ error: nameValidation.error });
    }

    const sectionValidation = validateSection(section);
    if (!sectionValidation.valid) {
        return res.status(400).json({ error: sectionValidation.error });
    }

    const validTermCode = termValidation.value;
    const validCourseName = nameValidation.value;
    const validSection = sectionValidation.value;

    // Check if course already exists
    const existingCourse = db.get('courses')
        .find({ termCode: validTermCode, section: validSection })
        .value();

    if (existingCourse) {
        return res.status(409).json({
            error: `Course ${validTermCode} and section ${validSection} already exists`
        });
    }

    // Create course
    const newCourse = {
        termCode: validTermCode,
        courseName: validCourseName,
        section: validSection,
        createdAt: new Date().toISOString()
    };

    db.get('courses')
        .push(newCourse)
        .write();

    res.status(201).json({
        message: 'Course created successfully',
        course: newCourse
    });
});

// Get course list
app.get('/api/courses', (req, res) => {
    const courses = db.get('courses').value();
    res.json({ courses: courses });
});

// Delete a course
app.delete('/api/courses/:termCode/:section?', (req, res) => {
    const { termCode, section } = req.params;

    const termValidation = validateTermCode(termCode);
    if (!termValidation.valid) {
        return res.status(400).json({ error: termValidation.error });
    }

    const sectionValidation = validateSection(section);
    if (!sectionValidation.valid) {
        return res.status(400).json({ error: sectionValidation.error });
    }

    const validTermCode = termValidation.value;
    const validSection = sectionValidation.value;

    const course = db.get('courses')
        .find({ termCode: validTermCode, section: validSection })
        .value();

    if (!course) {
        return res.status(404).json({
            error: `Course ${validTermCode} and section ${validSection} not found`
        });
    }

    // Delete members
    const membersToDelete = db.get('members')
        .filter({ termCode: validTermCode, section: validSection })
        .value();
    const membersDeleted = membersToDelete.length;

    db.get('members')
        .remove({ termCode: validTermCode, section: validSection })
        .write();

    // Delete course
    db.get('courses')
        .remove({ termCode: validTermCode, section: validSection })
        .write();

    res.json({
        message: 'Course deleted successfully',
        course: course,
        membersDeleted: membersDeleted
    });
});

// Add members to a course
app.post('/api/courses/:termCode/:section?/members', (req, res) => {
    const { termCode, section } = req.params;
    const { members: newMembers } = req.body;

    const termValidation = validateTermCode(termCode);
    if (!termValidation.valid) {
        return res.status(400).json({ error: termValidation.error });
    }

    const sectionValidation = validateSection(section);
    if (!sectionValidation.valid) {
        return res.status(400).json({ error: sectionValidation.error });
    }

    const validTermCode = termValidation.value;
    const validSection = sectionValidation.value;

    // Check if course exists
    const course = db.get('courses')
        .find({ termCode: validTermCode, section: validSection })
        .value();

    if (!course) {
        return res.status(404).json({
            error: `Course ${validTermCode} and section ${validSection} not found`
        });
    }

    if (!Array.isArray(newMembers)) {
        return res.status(400).json({ error: 'Members must be provided as an array' });
    }

    const addedMembers = [];
    const ignoredIds = [];

    for (const member of newMembers) {
        // Validate member fields
        const idValidation = validateMemberId(member.memberId);
        if (!idValidation.valid) {
            ignoredIds.push({ memberId: member.memberId, reason: idValidation.error });
            continue;
        }

        const firstNameValidation = validateName(member.firstName, 'First name');
        if (!firstNameValidation.valid) {
            ignoredIds.push({ memberId: member.memberId, reason: firstNameValidation.error });
            continue;
        }

        const lastNameValidation = validateName(member.lastName, 'Last name');
        if (!lastNameValidation.valid) {
            ignoredIds.push({ memberId: member.memberId, reason: lastNameValidation.error });
            continue;
        }

        const roleValidation = validateRole(member.role);
        if (!roleValidation.valid) {
            ignoredIds.push({ memberId: member.memberId, reason: roleValidation.error });
            continue;
        }

        const validMemberId = idValidation.value;

        // Check if member already exists
        const existingMember = db.get('members')
            .find({
                termCode: validTermCode,
                section: validSection,
                memberId: validMemberId
            })
            .value();

        if (existingMember) {
            ignoredIds.push(validMemberId);
            continue;
        }

        // Add member
        const newMember = {
            termCode: validTermCode,
            section: validSection,
            memberId: validMemberId,
            firstName: firstNameValidation.value,
            lastName: lastNameValidation.value,
            role: roleValidation.value,
            addedAt: new Date().toISOString()
        };

        db.get('members')
            .push(newMember)
            .write();

        addedMembers.push(newMember);
    }

    res.status(201).json({
        message: 'Members added',
        addedCount: addedMembers.length,
        addedMembers: addedMembers,
        ignoredIds: ignoredIds
    });
});

// Get member list
app.get('/api/courses/:termCode/:section?/members', (req, res) => {
    const { termCode, section } = req.params;
    const { role } = req.query;

    const termValidation = validateTermCode(termCode);
    if (!termValidation.valid) {
        return res.status(400).json({ error: termValidation.error });
    }

    const sectionValidation = validateSection(section);
    if (!sectionValidation.valid) {
        return res.status(400).json({ error: sectionValidation.error });
    }

    const validTermCode = termValidation.value;
    const validSection = sectionValidation.value;

    // Check if course exists
    const course = db.get('courses')
        .find({ termCode: validTermCode, section: validSection })
        .value();

    if (!course) {
        return res.status(404).json({
            error: `Course ${validTermCode} and section ${validSection} not found`
        });
    }

    // Filter members
    let filteredMembers = db.get('members')
        .filter({ termCode: validTermCode, section: validSection })
        .value();

    // Filter by role if provided
    if (role !== undefined && role !== null && role !== '') {
        const roleValidation = validateRole(role, false);
        if (!roleValidation.valid) {
            return res.status(400).json({ error: roleValidation.error });
        }
        const validRole = roleValidation.value;
        if (validRole !== '') {
            filteredMembers = filteredMembers.filter(
                m => m.role.toLowerCase() === validRole.toLowerCase()
            );
        }
    }

    res.json({
        members: filteredMembers,
        count: filteredMembers.length
    });
});

// Delete member list
app.delete('/api/courses/:termCode/:section?/members', (req, res) => {
    const { termCode, section } = req.params;
    const { memberIds } = req.body;

    const termValidation = validateTermCode(termCode);
    if (!termValidation.valid) {
        return res.status(400).json({ error: termValidation.error });
    }

    const sectionValidation = validateSection(section);
    if (!sectionValidation.valid) {
        return res.status(400).json({ error: sectionValidation.error });
    }

    const validTermCode = termValidation.value;
    const validSection = sectionValidation.value;

    // Check if course exists
    const course = db.get('courses')
        .find({ termCode: validTermCode, section: validSection })
        .value();

    if (!course) {
        return res.status(404).json({
            error: `Course ${validTermCode} and section ${validSection} not found`
        });
    }

    if (!Array.isArray(memberIds)) {
        return res.status(400).json({ error: 'Member IDs must be an array' });
    }

    const deletedMembers = [];
    const notFoundIds = [];

    for (const memberId of memberIds) {
        const member = db.get('members')
            .find({
                termCode: validTermCode,
                section: validSection,
                memberId: memberId
            })
            .value();

        if (member) {
            db.get('members')
                .remove({
                    termCode: validTermCode,
                    section: validSection,
                    memberId: memberId
                })
                .write();
            deletedMembers.push(memberId);
        } else {
            notFoundIds.push(memberId);
        }
    }

    res.json({
        message: 'Members deletion completed',
        deletedCount: deletedMembers.length,
        deletedMembers: deletedMembers,
        notFoundIds: notFoundIds
    });
});

// Create a sign-up sheet
app.post('/api/courses/:termCode/:section?/signup-sheets', (req, res) => {
    const { termCode, section } = req.params;
    const { assignmentName, notBefore, notAfter } = req.body;

    const termValidation = validateTermCode(termCode);
    if (!termValidation.valid) {
        return res.status(400).json({ error: termValidation.error });
    }

    const sectionValidation = validateSection(section);
    if (!sectionValidation.valid) {
        return res.status(400).json({ error: sectionValidation.error });
    }

    const nameValidation = validateAssignmentName(assignmentName);
    if (!nameValidation.valid) {
        return res.status(400).json({ error: nameValidation.error });
    }

    const notBeforeValidation = validateTimestamp(notBefore, 'Not-before timestamp');
    if (!notBeforeValidation.valid) {
        return res.status(400).json({ error: notBeforeValidation.error });
    }

    const notAfterValidation = validateTimestamp(notAfter, 'Not-after timestamp');
    if (!notAfterValidation.valid) {
        return res.status(400).json({ error: notAfterValidation.error });
    }

    const validTermCode = termValidation.value;
    const validSection = sectionValidation.value;
    const validAssignmentName = nameValidation.value;
    const validNotBefore = notBeforeValidation.value;
    const validNotAfter = notAfterValidation.value;

    // Check if course exists
    const course = db.get('courses')
        .find({ termCode: validTermCode, section: validSection })
        .value();

    if (!course) {
        return res.status(404).json({
            error: `Course ${validTermCode} and section ${validSection} not found`
        });
    }

    // Validate that notBefore is before notAfter
    if (new Date(validNotBefore) >= new Date(validNotAfter)) {
        return res.status(400).json({
            error: 'Not-before timestamp must be earlier than not-after timestamp'
        });
    }

    // Generate unique ID
    signupSheetIdCounter++;

    // Create signup sheet
    const newSignupSheet = {
        id: signupSheetIdCounter,
        termCode: validTermCode,
        section: validSection,
        assignmentName: validAssignmentName,
        notBefore: validNotBefore,
        notAfter: validNotAfter,
        createdAt: new Date().toISOString()
    };

    db.get('signupSheets')
        .push(newSignupSheet)
        .write();

    res.status(201).json({
        message: 'Signup sheet created successfully',
        signupSheet: newSignupSheet
    });
});

// Signup sheet deletion
app.delete('/api/signup-sheets/:id', (req, res) => {
    const { id } = req.params;
    const signupSheetId = parseInt(id);

    if (isNaN(signupSheetId)) {
        return res.status(400).json({ error: 'Signup sheet ID must be a number' });
    }

    const signupSheet = db.get('signupSheets')
        .find({ id: signupSheetId })
        .value();

    if (!signupSheet) {
        return res.status(404).json({
            error: `Signup sheet ${signupSheetId} not found`
        });
    }

    // Delete slot
    const slotsDeleted = db.get('slots')
        .filter({ signupSheetId: signupSheetId })
        .value().length;

    db.get('slots')
        .remove({ signupSheetId: signupSheetId })
        .write();

    // Delete signup
    const signupsDeleted = db.get('signups')
        .filter({ signupSheetId: signupSheetId })
        .value().length;

    db.get('signups')
        .remove({ signupSheetId: signupSheetId })
        .write();

    // Delete related grades
    db.get('grades')
        .remove({ signupSheetId: signupSheetId })
        .write();

    // Delete signup sheet
    db.get('signupSheets')
        .remove({ id: signupSheetId })
        .write();

    res.json({
        message: 'Signup sheet deleted successfully',
        signupSheet: signupSheet,
        slotsDeleted: slotsDeleted,
        signupsDeleted: signupsDeleted
    });
});

// Get list of signup sheets for a course
app.get('/api/courses/:termCode/:section?/signup-sheets', (req, res) => {
    const { termCode, section } = req.params;

    const termValidation = validateTermCode(termCode);
    if (!termValidation.valid) {
        return res.status(400).json({ error: termValidation.error });
    }

    const sectionValidation = validateSection(section);
    if (!sectionValidation.valid) {
        return res.status(400).json({ error: sectionValidation.error });
    }

    const validTermCode = termValidation.value;
    const validSection = sectionValidation.value;

    // Check if course exists
    const course = db.get('courses')
        .find({ termCode: validTermCode, section: validSection })
        .value();

    if (!course) {
        return res.status(404).json({
            error: `Course with term code ${validTermCode} and section ${validSection} not found`
        });
    }

    const signupSheets = db.get('signupSheets')
        .filter({ termCode: validTermCode, section: validSection })
        .value();

    res.json({
        signupSheets: signupSheets,
        count: signupSheets.length
    });
});

// Add slots for a signup sheet
app.post('/api/signup-sheets/:id/slots', (req, res) => {
    const { id } = req.params;
    const { start, slotDuration, numSlots, maxMembers } = req.body;

    const signupSheetId = parseInt(id);
    if (isNaN(signupSheetId)) {
        return res.status(400).json({ error: 'Signup sheet ID must be a number' });
    }

    // Input validation
    const startValidation = validateTimestamp(start, 'Start timestamp');
    if (!startValidation.valid) {
        return res.status(400).json({ error: startValidation.error });
    }

    const durationValidation = validateSlotDuration(slotDuration);
    if (!durationValidation.valid) {
        return res.status(400).json({ error: durationValidation.error });
    }

    const numSlotsValidation = validateNumSlots(numSlots);
    if (!numSlotsValidation.valid) {
        return res.status(400).json({ error: numSlotsValidation.error });
    }

    const maxMembersValidation = validateMaxMembers(maxMembers);
    if (!maxMembersValidation.valid) {
        return res.status(400).json({ error: maxMembersValidation.error });
    }

    const validStart = startValidation.value;
    const validDuration = durationValidation.value;
    const validNumSlots = numSlotsValidation.value;
    const validMaxMembers = maxMembersValidation.value;

    // Check if signup sheet exists
    const signupSheet = db.get('signupSheets')
        .find({ id: signupSheetId })
        .value();

    if (!signupSheet) {
        return res.status(404).json({
            error: `Signup sheet ${signupSheetId} not found`
        });
    }

    // Create slots
    const createdSlots = [];
    let currentStart = new Date(validStart);

    for (let i = 0; i < validNumSlots; i++) {
        slotIdCounter++;

        const slotEnd = new Date(currentStart.getTime() + validDuration * 60000);

        const newSlot = {
            id: slotIdCounter,
            signupSheetId: signupSheetId,
            start: currentStart.toISOString(),
            end: slotEnd.toISOString(),
            duration: validDuration,
            maxMembers: validMaxMembers,
            currentSignups: 0,
            createdAt: new Date().toISOString()
        };

        db.get('slots')
            .push(newSlot)
            .write();

        createdSlots.push(newSlot);

        currentStart = slotEnd;
    }

    res.status(201).json({
        message: 'Slots created successfully',
        slots: createdSlots,
        count: createdSlots.length
    });
});

// Get list of slots for a signup sheet
app.get('/api/signup-sheets/:id/slots', (req, res) => {
    const { id } = req.params;
    const signupSheetId = parseInt(id);

    if (isNaN(signupSheetId)) {
        return res.status(400).json({ error: 'Signup sheet ID must be a number' });
    }

    // Check if signup sheet exists
    const signupSheet = db.get('signupSheets')
        .find({ id: signupSheetId })
        .value();

    if (!signupSheet) {
        return res.status(404).json({
            error: `Signup sheet ${signupSheetId} not found`
        });
    }

    const slots = db.get('slots')
        .filter({ signupSheetId: signupSheetId })
        .value();

    // Add signup information to each slot
    const slotsWithSignups = slots.map(slot => {
        const signups = db.get('signups')
            .filter({ slotId: slot.id })
            .value();

        return {
            ...slot,
            signups: signups,
            currentSignups: signups.length
        };
    });

    res.json({
        slots: slotsWithSignups,
        count: slotsWithSignups.length
    });
});

// Slot modification
app.patch('/api/slots/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const slotId = parseInt(id);

    if (isNaN(slotId)) {
        return res.status(400).json({ error: 'Slot ID must be a number' });
    }

    const slot = db.get('slots')
        .find({ id: slotId })
        .value();

    if (!slot) {
        return res.status(404).json({
            error: `Slot ${slotId} not found`
        });
    }

    // Check if members have signed up
    const signups = db.get('signups')
        .filter({ slotId: slotId })
        .value();

    const memberIds = signups.map(s => s.memberId);

    // Validate and apply updates
    const validatedUpdates = {};

    if (updates.start !== undefined) {
        const startValidation = validateTimestamp(updates.start, 'Start timestamp');
        if (!startValidation.valid) {
            return res.status(400).json({ error: startValidation.error });
        }
        validatedUpdates.start = startValidation.value;

        // Recalculate end time if duration exists
        if (slot.duration) {
            const newEnd = new Date(new Date(validatedUpdates.start).getTime() + slot.duration * 60000);
            validatedUpdates.end = newEnd.toISOString();
        }
    }

    if (updates.duration !== undefined) {
        const durationValidation = validateSlotDuration(updates.duration);
        if (!durationValidation.valid) {
            return res.status(400).json({ error: durationValidation.error });
        }
        validatedUpdates.duration = durationValidation.value;

        // Recalculate end time
        const startTime = validatedUpdates.start || slot.start;
        const newEnd = new Date(new Date(startTime).getTime() + validatedUpdates.duration * 60000);
        validatedUpdates.end = newEnd.toISOString();
    }

    if (updates.maxMembers !== undefined) {
        const maxMembersValidation = validateMaxMembers(updates.maxMembers);
        if (!maxMembersValidation.valid) {
            return res.status(400).json({ error: maxMembersValidation.error });
        }

        // Check if assigned max number is smaller than current signups numbers
        if (maxMembersValidation.value < signups.length) {
            return res.status(400).json({
                error: `Cannot reduce max members to ${maxMembersValidation.value} because ${signups.length} members have already signed up`
            });
        }

        validatedUpdates.maxMembers = maxMembersValidation.value;
    }

    // Update slot
    db.get('slots')
        .find({ id: slotId })
        .assign(validatedUpdates)
        .write();

    const updatedSlot = db.get('slots')
        .find({ id: slotId })
        .value();

    res.json({
        message: 'Slot updated successfully',
        slot: updatedSlot,
        affectedMembers: memberIds.length > 0 ? memberIds : []
    });
});

// Delete a slot
app.delete('/api/slots/:id', (req, res) => {
    const { id } = req.params;
    const slotId = parseInt(id);

    if (isNaN(slotId)) {
        return res.status(400).json({ error: 'Slot ID must be a number' });
    }

    const slot = db.get('slots')
        .find({ id: slotId })
        .value();

    if (!slot) {
        return res.status(404).json({
            error: `Slot ${slotId} not found`
        });
    }

    // Check if members have signed up
    const signups = db.get('signups')
        .filter({ slotId: slotId })
        .value();

    if (signups.length > 0) {
        return res.status(400).json({
            error: `Cannot delete slot ${slotId} because ${signups.length} member(s) have signed up. Please cancel all signups first.`
        });
    }

    // Delete slot
    db.get('slots')
        .remove({ id: slotId })
        .write();

    res.json({
        message: 'Slot deleted successfully',
        slot: slot
    });
});

// Sign up for an assignment
app.post('/api/signup-sheets/:sheetId/slots/:slotId/signup', (req, res) => {
    const { sheetId, slotId } = req.params;
    const { memberId } = req.body;

    const signupSheetId = parseInt(sheetId);
    const slotIdNum = parseInt(slotId);

    if (isNaN(signupSheetId)) {
        return res.status(400).json({ error: 'Signup sheet ID must be a number' });
    }

    if (isNaN(slotIdNum)) {
        return res.status(400).json({ error: 'Slot ID must be a number' });
    }

    if (!memberId) {
        return res.status(400).json({ error: 'Member ID cannot be blank' });
    }

    // Member ID validation
    const memberIdValidation = validateMemberId(memberId);
    if (!memberIdValidation.valid) {
        return res.status(400).json({ error: memberIdValidation.error });
    }
    const validMemberId = memberIdValidation.value;

    // Check if signup sheet exists
    const signupSheet = db.get('signupSheets')
        .find({ id: signupSheetId })
        .value();

    if (!signupSheet) {
        return res.status(404).json({
            error: `Signup sheet ${signupSheetId} not found`
        });
    }

    // Check if slot exists and belongs to this signup sheet
    const slot = db.get('slots')
        .find({ id: slotIdNum, signupSheetId: signupSheetId })
        .value();

    if (!slot) {
        return res.status(404).json({
            error: `Slot ${slotIdNum} not found for this signup sheet`
        });
    }

    // Check if member has already signed up
    const existingSignup = db.get('signups')
        .find({ signupSheetId: signupSheetId, memberId: validMemberId })
        .value();

    if (existingSignup) {
        return res.status(409).json({
            error: `Member ${validMemberId} has already signed up for this assignment in slot ${existingSignup.slotId}`
        });
    }

    // Check if slot is full
    const currentSignups = db.get('signups')
        .filter({ slotId: slotIdNum })
        .value().length;

    if (currentSignups >= slot.maxMembers) {
        return res.status(409).json({
            error: `Slot ${slotIdNum} is full (${slot.maxMembers}/${slot.maxMembers} members)`
        });
    }

    // Check if current time is within the allowed signup window
    const now = new Date();
    const notBefore = new Date(signupSheet.notBefore);
    const notAfter = new Date(signupSheet.notAfter);

    if (now < notBefore) {
        return res.status(400).json({
            error: `Signup is not yet open. Opens at ${notBefore.toISOString()}`
        });
    }

    if (now > notAfter) {
        return res.status(400).json({
            error: `Signup has closed. Closed at ${notAfter.toISOString()}`
        });
    }

    // Signup creation
    const newSignup = {
        signupSheetId: signupSheetId,
        slotId: slotIdNum,
        memberId: validMemberId,
        signupTime: new Date().toISOString()
    };

    db.get('signups')
        .push(newSignup)
        .write();

    res.status(201).json({
        message: 'Successfully signed up',
        signup: newSignup,
        slot: slot
    });
});

// Delete a sign-up
app.delete('/api/signup-sheets/:sheetId/signups/:memberId', (req, res) => {
    const { sheetId, memberId } = req.params;
    const signupSheetId = parseInt(sheetId);

    if (isNaN(signupSheetId)) {
        return res.status(400).json({ error: 'Signup sheet ID must be a number' });
    }

    if (!memberId) {
        return res.status(400).json({ error: 'Member ID cannot be blank' });
    }

    // Find the signup
    const signup = db.get('signups')
        .find({ signupSheetId: signupSheetId, memberId: memberId })
        .value();

    if (!signup) {
        return res.status(404).json({
            error: `No signup found for member ${memberId} in signup sheet ${signupSheetId}`
        });
    }

    // Get slot information
    const slot = db.get('slots')
        .find({ id: signup.slotId })
        .value();

    // Delete signup
    db.get('signups')
        .remove({ signupSheetId: signupSheetId, memberId: memberId })
        .write();

    res.json({
        message: 'Signup deleted successfully',
        signup: signup,
        slot: slot
    });
});

// Get members for a given slot
app.get('/api/slots/:slotId/members', (req, res) => {
    const { slotId } = req.params;
    const slotIdNum = parseInt(slotId);

    if (isNaN(slotIdNum)) {
        return res.status(400).json({ error: 'Slot ID must be a number' });
    }

    // Check if slot exists
    const slot = db.get('slots')
        .find({ id: slotIdNum })
        .value();

    if (!slot) {
        return res.status(404).json({
            error: `Slot ${slotIdNum} not found`
        });
    }

    // Get all signups for this slot
    const signups = db.get('signups')
        .filter({ slotId: slotIdNum })
        .value();

    // Get signup sheet to find termCode and section
    const signupSheet = db.get('signupSheets')
        .find({ id: slot.signupSheetId })
        .value();

    if (!signupSheet) {
        return res.status(404).json({
            error: `Signup sheet ${slot.signupSheetId} not found`
        });
    }

    // Get member details for each signup
    const membersWithData = signups.map(signup => {
        const member = db.get('members')
            .find({
                termCode: signupSheet.termCode,
                section: signupSheet.section,
                memberId: signup.memberId
            })
            .value();

        // Get grade info if exists
        const grade = db.get('grades')
            .find({
                memberId: signup.memberId,
                signupSheetId: slot.signupSheetId
            })
            .value();

        return {
            memberId: signup.memberId,
            firstName: member ? member.firstName : 'Unknown',
            lastName: member ? member.lastName : 'Unknown',
            role: member ? member.role : 'Unknown',
            signupTime: signup.signupTime,
            grade: grade ? grade.grade : null,
            comment: grade ? grade.comment : null
        };
    });

    res.json({
        slotId: slotIdNum,
        signupSheetId: slot.signupSheetId,
        members: membersWithData,
        count: membersWithData.length
    });
});

// Enter or modify grade and comment for a member
app.post('/api/grades', (req, res) => {
    const { memberId, signupSheetId, grade, comment } = req.body;

    // Member ID validation
    const memberIdValidation = validateMemberId(memberId);
    if (!memberIdValidation.valid) {
        return res.status(400).json({ error: memberIdValidation.error });
    }
    const validMemberId = memberIdValidation.value;

    // Signup sheet ID validation
    const sheetId = parseInt(signupSheetId);
    if (isNaN(sheetId) || sheetId < 1) {
        return res.status(400).json({ error: 'Signup sheet ID must be a valid positive number' });
    }

    // Grade validation
    const gradeValidation = validateGrade(grade);
    if (!gradeValidation.valid) {
        return res.status(400).json({ error: gradeValidation.error });
    }
    const validGrade = gradeValidation.value;

    // Comment validation
    const commentValidation = validateComment(comment, false);
    if (!commentValidation.valid) {
        return res.status(400).json({ error: commentValidation.error });
    }
    const validComment = commentValidation.value;

    // Check if signup sheet exists
    const signupSheet = db.get('signupSheets')
        .find({ id: sheetId })
        .value();

    if (!signupSheet) {
        return res.status(404).json({
            error: `Signup sheet ${sheetId} not found`
        });
    }

    // Check if member has signed up for this sheet
    const signup = db.get('signups')
        .find({ signupSheetId: sheetId, memberId: validMemberId })
        .value();

    if (!signup) {
        return res.status(404).json({
            error: `Member ${validMemberId} has not signed up for signup sheet ${sheetId}`
        });
    }

    // Check if grade already exists
    const existingGrade = db.get('grades')
        .find({ memberId: validMemberId, signupSheetId: sheetId })
        .value();

    if (existingGrade) {
        // Update and append comment if grade exists
        const originalGrade = existingGrade.originalGrade || existingGrade.grade;

        // Append comment with newline separator if both exist
        let updatedComment = existingGrade.comment || '';
        if (updatedComment && validComment) {
            updatedComment = updatedComment + '\n' + validComment;
        } else if (validComment) {
            updatedComment = validComment;
        }

        // Truncate to 500 chars if needed
        if (updatedComment.length > 500) {
            updatedComment = updatedComment.substring(0, 500);
        }

        db.get('grades')
            .find({ memberId: validMemberId, signupSheetId: sheetId })
            .assign({
                grade: validGrade,
                comment: updatedComment,
                updatedAt: new Date().toISOString()
            })
            .write();

        const updatedGradeRecord = db.get('grades')
            .find({ memberId: validMemberId, signupSheetId: sheetId })
            .value();

        return res.json({
            message: 'Grade updated successfully',
            grade: updatedGradeRecord,
            originalGrade: originalGrade
        });
    } else {
        // Create new grade entry
        const newGrade = {
            memberId: validMemberId,
            signupSheetId: sheetId,
            grade: validGrade,
            comment: validComment,
            originalGrade: validGrade,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        db.get('grades')
            .push(newGrade)
            .write();

        return res.status(201).json({
            message: 'Grade created successfully',
            grade: newGrade
        });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});