const API_BASE = '/api';

// Tab switching function
function switchTab(tabName) {
    // Remove active class from all tabs and contents
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));

    // Add active class to selected tab
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function showAlert(elementId, message, type) {
    const alertElement = document.getElementById(elementId);
    alertElement.textContent = message;
    alertElement.className = `alert ${type} show`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertElement.classList.remove('show');
    }, 5000);
}

// Create Course
document.getElementById('create-course-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const termCode = document.getElementById('course-term').value;
    const courseName = document.getElementById('course-name').value;
    const section = document.getElementById('course-section').value || 1;

    try {
        const response = await fetch(`${API_BASE}/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                termCode: parseInt(termCode),
                courseName: courseName,
                section: parseInt(section)
            })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('create-course-alert', `✓ ${data.message}`, 'success');
            document.getElementById('create-course-form').reset();
        } else {
            showAlert('create-course-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('create-course-alert', `✗ Network error: ${error.message}`, 'error');
    }
});

// Delete Course
async function deleteCourse() {
    const termCode = document.getElementById('delete-term').value;
    const section = document.getElementById('delete-section').value || 1;

    if (!termCode) {
        showAlert('delete-course-alert', '✗ Please enter a term code', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete course ${termCode}-${section}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/courses/${termCode}/${section}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('delete-course-alert', `✓ ${data.message}. Deleted ${data.membersDeleted} members.`, 'success');
            document.getElementById('delete-term').value = '';
            document.getElementById('delete-section').value = '';
        } else {
            showAlert('delete-course-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('delete-course-alert', `✗ Network error: ${error.message}`, 'error');
    }
}

// Add member input fields dynamically
let memberCount = 1;
function addMemberInput() {
    memberCount++;
    const container = document.getElementById('members-container');

    const memberDiv = document.createElement('div');
    memberDiv.className = 'member-input-group';
    memberDiv.innerHTML = `
        <div class="member-input-header">
            <strong>Member ${memberCount}</strong>
            <button type="button" class="remove-member" onclick="removeMemberInput(this)">Remove</button>
        </div>
        <div class="form-group">
            <label>Member ID (8 chars) *</label>
            <input type="text" class="member-id" required maxlength="8">
        </div>
        <div class="form-group">
            <label>First Name (max 200 chars) *</label>
            <input type="text" class="member-firstname" required maxlength="200">
        </div>
        <div class="form-group">
            <label>Last Name (max 200 chars) *</label>
            <input type="text" class="member-lastname" required maxlength="200">
        </div>
        <div class="form-group">
            <label>Role (max 10 chars) *</label>
            <input type="text" class="member-role" required maxlength="10" placeholder="e.g., Student, TA, Prof">
        </div>
    `;

    container.appendChild(memberDiv);
}

// Remove member input
function removeMemberInput(button) {
    const memberDiv = button.closest('.member-input-group');
    memberDiv.remove();
}

// Submit Members
async function submitMembers() {
    const termCode = document.getElementById('members-term').value;
    const section = document.getElementById('members-section').value || 1;

    if (!termCode) {
        showAlert('add-members-alert', '✗ Please enter a term code', 'error');
        return;
    }

    // Collect all member inputs
    const memberGroups = document.querySelectorAll('.member-input-group');
    const members = [];

    for (const group of memberGroups) {
        const memberId = group.querySelector('.member-id').value;
        const firstName = group.querySelector('.member-firstname').value;
        const lastName = group.querySelector('.member-lastname').value;
        const role = group.querySelector('.member-role').value;

        if (!memberId || !firstName || !lastName || !role) {
            showAlert('add-members-alert', '✗ Please fill in all member fields', 'error');
            return;
        }

        members.push({
            memberId: memberId,
            firstName: firstName,
            lastName: lastName,
            role: role
        });
    }

    try {
        const response = await fetch(`${API_BASE}/courses/${termCode}/${section}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ members: members })
        });

        const data = await response.json();

        if (response.ok) {
            let message = `✓ ${data.message}. Added ${data.addedCount} member(s).`;
            if (data.ignoredIds.length > 0) {
                message += ` Ignored ${data.ignoredIds.length} ID(s).`;
            }
            showAlert('add-members-alert', message, 'success');

            // Reset form
            document.getElementById('members-term').value = '';
            document.getElementById('members-section').value = '';
            document.getElementById('members-container').innerHTML = `
                <div class="member-input-group">
                    <div class="member-input-header">
                        <strong>Member 1</strong>
                    </div>
                    <div class="form-group">
                        <label>Member ID (8 chars) *</label>
                        <input type="text" class="member-id" required maxlength="8">
                    </div>
                    <div class="form-group">
                        <label>First Name (max 200 chars) *</label>
                        <input type="text" class="member-firstname" required maxlength="200">
                    </div>
                    <div class="form-group">
                        <label>Last Name (max 200 chars) *</label>
                        <input type="text" class="member-lastname" required maxlength="200">
                    </div>
                    <div class="form-group">
                        <label>Role (max 10 chars) *</label>
                        <input type="text" class="member-role" required maxlength="10" placeholder="e.g., Student, TA, Prof">
                    </div>
                </div>
            `;
            memberCount = 1;
        } else {
            showAlert('add-members-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('add-members-alert', `✗ Network error: ${error.message}`, 'error');
    }
}

// Delete Members
async function deleteMembers() {
    const termCode = document.getElementById('del-members-term').value;
    const section = document.getElementById('del-members-section').value || 1;
    const memberIdsInput = document.getElementById('del-member-ids').value;

    if (!termCode || !memberIdsInput) {
        showAlert('delete-members-alert', '✗ Please enter term code and member IDs', 'error');
        return;
    }

    // Parse comma-separated member IDs
    const memberIds = memberIdsInput.split(',').map(id => id.trim()).filter(id => id);

    if (memberIds.length === 0) {
        showAlert('delete-members-alert', '✗ Please enter valid member IDs', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${memberIds.length} member(s)?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/courses/${termCode}/${section}/members`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ memberIds: memberIds })
        });

        const data = await response.json();

        if (response.ok) {
            let message = `✓ ${data.message}. Deleted ${data.deletedCount} member(s).`;
            if (data.notFoundIds.length > 0) {
                message += ` ${data.notFoundIds.length} ID(s) not found.`;
            }
            showAlert('delete-members-alert', message, 'success');

            // Reset form
            document.getElementById('del-members-term').value = '';
            document.getElementById('del-members-section').value = '';
            document.getElementById('del-member-ids').value = '';
        } else {
            showAlert('delete-members-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('delete-members-alert', `✗ Network error: ${error.message}`, 'error');
    }
}

// Load Courses
async function loadCourses() {
    const displayElement = document.getElementById('courses-display');
    displayElement.innerHTML = '<div class="loading">Loading courses...</div>';

    try {
        const response = await fetch(`${API_BASE}/courses`);
        const data = await response.json();

        if (response.ok) {
            if (data.courses.length === 0) {
                displayElement.innerHTML = '<div class="no-data">No courses found. Create one to get started!</div>';
            } else {
                // Create table using DOM methods
                const title = document.createElement('h3');
                title.textContent = `All Courses (${data.courses.length})`;

                const table = document.createElement('table');
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');

                ['Term Code', 'Course Name', 'Section', 'Created At'].forEach(headerText => {
                    const th = document.createElement('th');
                    th.textContent = headerText;
                    headerRow.appendChild(th);
                });

                thead.appendChild(headerRow);
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                data.courses.forEach(course => {
                    const row = document.createElement('tr');

                    const tdTermCode = document.createElement('td');
                    tdTermCode.textContent = course.termCode;
                    row.appendChild(tdTermCode);

                    const tdCourseName = document.createElement('td');
                    tdCourseName.textContent = course.courseName;  // Safe from XSS
                    row.appendChild(tdCourseName);

                    const tdSection = document.createElement('td');
                    tdSection.textContent = course.section;
                    row.appendChild(tdSection);

                    const tdCreatedAt = document.createElement('td');
                    tdCreatedAt.textContent = new Date(course.createdAt).toLocaleString();
                    row.appendChild(tdCreatedAt);

                    tbody.appendChild(row);
                });

                table.appendChild(tbody);

                // Clear and append safely
                displayElement.innerHTML = '';
                displayElement.appendChild(title);
                displayElement.appendChild(table);
            }
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'no-data';
            errorDiv.textContent = `Error: ${data.error}`;
            displayElement.innerHTML = '';
            displayElement.appendChild(errorDiv);
        }
    } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'no-data';
        errorDiv.textContent = `Network error: ${error.message}`;
        displayElement.innerHTML = '';
        displayElement.appendChild(errorDiv);
    }
}

// Load Members
async function loadMembers() {
    const termCode = document.getElementById('view-term').value;
    const section = document.getElementById('view-section').value || 1;
    const role = document.getElementById('view-role').value;

    if (!termCode) {
        alert('Please enter a term code');
        return;
    }

    const displayElement = document.getElementById('members-display');
    displayElement.innerHTML = '<div class="loading">Loading members...</div>';

    try {
        let url = `${API_BASE}/courses/${termCode}/${section}/members`;
        if (role) {
            url += `?role=${encodeURIComponent(role)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            if (data.members.length === 0) {
                displayElement.innerHTML = '<div class="no-data">No members found for this course.</div>';
            } else {
                // Create table using DOM methods
                const title = document.createElement('h3');
                title.textContent = `Course Members (${data.count})`;

                const table = document.createElement('table');
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');

                ['Member ID', 'First Name', 'Last Name', 'Role', 'Added At'].forEach(headerText => {
                    const th = document.createElement('th');
                    th.textContent = headerText;
                    headerRow.appendChild(th);
                });

                thead.appendChild(headerRow);
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                data.members.forEach(member => {
                    const row = document.createElement('tr');

                    const tdMemberId = document.createElement('td');
                    tdMemberId.textContent = member.memberId;  // Safe from XSS
                    row.appendChild(tdMemberId);

                    const tdFirstName = document.createElement('td');
                    tdFirstName.textContent = member.firstName;  // Safe from XSS
                    row.appendChild(tdFirstName);

                    const tdLastName = document.createElement('td');
                    tdLastName.textContent = member.lastName;  // Safe from XSS
                    row.appendChild(tdLastName);

                    const tdRole = document.createElement('td');
                    tdRole.textContent = member.role;  // Safe from XSS
                    row.appendChild(tdRole);

                    const tdAddedAt = document.createElement('td');
                    tdAddedAt.textContent = new Date(member.addedAt).toLocaleString();
                    row.appendChild(tdAddedAt);

                    tbody.appendChild(row);
                });

                table.appendChild(tbody);

                displayElement.innerHTML = '';
                displayElement.appendChild(title);
                displayElement.appendChild(table);
            }
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'no-data';
            errorDiv.textContent = `Error: ${data.error}`;
            displayElement.innerHTML = '';
            displayElement.appendChild(errorDiv);
        }
    } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'no-data';
        errorDiv.textContent = `Network error: ${error.message}`;
        displayElement.innerHTML = '';
        displayElement.appendChild(errorDiv);
    }
}

// Create Signup Sheet
document.getElementById('create-sheet-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const termCode = document.getElementById('sheet-term').value;
    const section = document.getElementById('sheet-section').value || 1;
    const assignmentName = document.getElementById('sheet-assignment').value;
    const notBefore = document.getElementById('sheet-not-before').value;
    const notAfter = document.getElementById('sheet-not-after').value;

    if (!notBefore || !notAfter) {
        showAlert('create-sheet-alert', '✗ Please provide both timestamps', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/courses/${termCode}/${section}/signup-sheets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                assignmentName: assignmentName,
                notBefore: new Date(notBefore).toISOString(),
                notAfter: new Date(notAfter).toISOString()
            })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('create-sheet-alert', `✓ ${data.message}. Sheet ID: ${data.signupSheet.id}`, 'success');
            document.getElementById('create-sheet-form').reset();
        } else {
            showAlert('create-sheet-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('create-sheet-alert', `✗ Network error: ${error.message}`, 'error');
    }
});

// Delete Signup Sheet
async function deleteSignupSheet() {
    const sheetId = document.getElementById('delete-sheet-id').value;

    if (!sheetId) {
        showAlert('delete-sheet-alert', '✗ Please enter a signup sheet ID', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete signup sheet ${sheetId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/signup-sheets/${sheetId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('delete-sheet-alert', `✓ ${data.message}. Deleted ${data.slotsDeleted} slots and ${data.signupsDeleted} signups.`, 'success');
            document.getElementById('delete-sheet-id').value = '';
        } else {
            showAlert('delete-sheet-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('delete-sheet-alert', `✗ Network error: ${error.message}`, 'error');
    }
}

// Load Signup Sheet
async function loadSignupSheets() {
    const termCode = document.getElementById('view-sheets-term').value;
    const section = document.getElementById('view-sheets-section').value || 1;

    if (!termCode) {
        alert('Please enter a term code');
        return;
    }

    const displayElement = document.getElementById('sheets-display');
    displayElement.innerHTML = '<div class="loading">Loading signup sheets...</div>';

    try {
        const response = await fetch(`${API_BASE}/courses/${termCode}/${section}/signup-sheets`);
        const data = await response.json();

        if (response.ok) {
            if (data.signupSheets.length === 0) {
                displayElement.innerHTML = '<div class="no-data">No signup sheets found for this course.</div>';
            } else {
                // Create table safely using DOM methods
                const title = document.createElement('h3');
                title.textContent = `Sign-up Sheets (${data.count})`;

                const table = document.createElement('table');
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');

                ['ID', 'Assignment Name', 'Opens', 'Closes', 'Created'].forEach(headerText => {
                    const th = document.createElement('th');
                    th.textContent = headerText;
                    headerRow.appendChild(th);
                });

                thead.appendChild(headerRow);
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                data.signupSheets.forEach(sheet => {
                    const row = document.createElement('tr');

                    const tdId = document.createElement('td');
                    tdId.textContent = sheet.id;
                    row.appendChild(tdId);

                    const tdName = document.createElement('td');
                    tdName.textContent = sheet.assignmentName;
                    row.appendChild(tdName);

                    const tdNotBefore = document.createElement('td');
                    tdNotBefore.textContent = new Date(sheet.notBefore).toLocaleString();
                    row.appendChild(tdNotBefore);

                    const tdNotAfter = document.createElement('td');
                    tdNotAfter.textContent = new Date(sheet.notAfter).toLocaleString();
                    row.appendChild(tdNotAfter);

                    const tdCreated = document.createElement('td');
                    tdCreated.textContent = new Date(sheet.createdAt).toLocaleString();
                    row.appendChild(tdCreated);

                    tbody.appendChild(row);
                });

                table.appendChild(tbody);

                displayElement.innerHTML = '';
                displayElement.appendChild(title);
                displayElement.appendChild(table);
            }
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'no-data';
            errorDiv.textContent = `Error: ${data.error}`;
            displayElement.innerHTML = '';
            displayElement.appendChild(errorDiv);
        }
    } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'no-data';
        errorDiv.textContent = `Network error: ${error.message}`;
        displayElement.innerHTML = '';
        displayElement.appendChild(errorDiv);
    }
}

// Add Slots
document.getElementById('add-slots-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const sheetId = document.getElementById('slots-sheet-id').value;
    const start = document.getElementById('slots-start').value;
    const duration = document.getElementById('slots-duration').value;
    const numSlots = document.getElementById('slots-num').value;
    const maxMembers = document.getElementById('slots-max').value;

    if (!start) {
        showAlert('add-slots-alert', '✗ Please provide start time', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/signup-sheets/${sheetId}/slots`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start: new Date(start).toISOString(),
                slotDuration: parseInt(duration),
                numSlots: parseInt(numSlots),
                maxMembers: parseInt(maxMembers)
            })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('add-slots-alert', `✓ ${data.message}. Created ${data.count} slots.`, 'success');
            document.getElementById('add-slots-form').reset();
        } else {
            showAlert('add-slots-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('add-slots-alert', `✗ Network error: ${error.message}`, 'error');
    }
});

// Load Slots
async function loadSlots() {
    const sheetId = document.getElementById('view-slots-sheet-id').value;

    if (!sheetId) {
        alert('Please enter a signup sheet ID');
        return;
    }

    const displayElement = document.getElementById('slots-display');
    displayElement.innerHTML = '<div class="loading">Loading slots...</div>';

    try {
        const response = await fetch(`${API_BASE}/signup-sheets/${sheetId}/slots`);
        const data = await response.json();

        if (response.ok) {
            if (data.slots.length === 0) {
                displayElement.innerHTML = '<div class="no-data">No slots found for this signup sheet.</div>';
            } else {
                const title = document.createElement('h3');
                title.textContent = `Time Slots (${data.count})`;

                const table = document.createElement('table');
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');

                ['Slot ID', 'Start Time', 'End Time', 'Duration', 'Signups', 'Max', 'Members'].forEach(headerText => {
                    const th = document.createElement('th');
                    th.textContent = headerText;
                    headerRow.appendChild(th);
                });

                thead.appendChild(headerRow);
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                data.slots.forEach(slot => {
                    const row = document.createElement('tr');

                    const tdId = document.createElement('td');
                    tdId.textContent = slot.id;
                    row.appendChild(tdId);

                    const tdStart = document.createElement('td');
                    tdStart.textContent = new Date(slot.start).toLocaleString();
                    row.appendChild(tdStart);

                    const tdEnd = document.createElement('td');
                    tdEnd.textContent = new Date(slot.end).toLocaleString();
                    row.appendChild(tdEnd);

                    const tdDuration = document.createElement('td');
                    tdDuration.textContent = `${slot.duration} min`;
                    row.appendChild(tdDuration);

                    const tdSignups = document.createElement('td');
                    tdSignups.textContent = slot.currentSignups;
                    row.appendChild(tdSignups);

                    const tdMax = document.createElement('td');
                    tdMax.textContent = slot.maxMembers;
                    row.appendChild(tdMax);

                    const tdMembers = document.createElement('td');
                    const memberIds = slot.signups.map(s => s.memberId).join(', ');
                    tdMembers.textContent = memberIds || '-';
                    row.appendChild(tdMembers);

                    tbody.appendChild(row);
                });

                table.appendChild(tbody);

                displayElement.innerHTML = '';
                displayElement.appendChild(title);
                displayElement.appendChild(table);
            }
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'no-data';
            errorDiv.textContent = `Error: ${data.error}`;
            displayElement.innerHTML = '';
            displayElement.appendChild(errorDiv);
        }
    } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'no-data';
        errorDiv.textContent = `Network error: ${error.message}`;
        displayElement.innerHTML = '';
        displayElement.appendChild(errorDiv);
    }
}

// Sign up for Slot
async function signupForSlot() {
    const sheetId = document.getElementById('signup-sheet-id').value;
    const slotId = document.getElementById('signup-slot-id').value;
    const memberId = document.getElementById('signup-member-id').value;

    if (!sheetId || !slotId || !memberId) {
        showAlert('signup-alert', '✗ Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/signup-sheets/${sheetId}/slots/${slotId}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                memberId: memberId
            })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('signup-alert', `✓ ${data.message}. Member ${memberId} signed up for slot ${slotId}.`, 'success');
            document.getElementById('signup-sheet-id').value = '';
            document.getElementById('signup-slot-id').value = '';
            document.getElementById('signup-member-id').value = '';
        } else {
            showAlert('signup-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('signup-alert', `✗ Network error: ${error.message}`, 'error');
    }
}

// Cancel Signup
async function cancelSignup() {
    const sheetId = document.getElementById('cancel-sheet-id').value;
    const memberId = document.getElementById('cancel-member-id').value;

    if (!sheetId || !memberId) {
        showAlert('cancel-signup-alert', '✗ Please fill in all fields', 'error');
        return;
    }

    if (!confirm(`Cancel signup for member ${memberId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/signup-sheets/${sheetId}/signups/${memberId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('cancel-signup-alert', `✓ ${data.message}. Removed from slot ${data.slot.id}.`, 'success');
            document.getElementById('cancel-sheet-id').value = '';
            document.getElementById('cancel-member-id').value = '';
        } else {
            showAlert('cancel-signup-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('cancel-signup-alert', `✗ Network error: ${error.message}`, 'error');
    }
}

// Modify Slot
document.getElementById('modify-slot-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const slotId = document.getElementById('modify-slot-id').value;
    const start = document.getElementById('modify-start').value;
    const duration = document.getElementById('modify-duration').value;
    const maxMembers = document.getElementById('modify-max').value;

    const updates = {};

    if (start) {
        updates.start = new Date(start).toISOString();
    }
    if (duration) {
        updates.duration = parseInt(duration);
    }
    if (maxMembers) {
        updates.maxMembers = parseInt(maxMembers);
    }

    if (Object.keys(updates).length === 0) {
        showAlert('modify-slot-alert', '✗ Please provide at least one field to update', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/slots/${slotId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        const data = await response.json();

        if (response.ok) {
            let message = `✓ ${data.message}.`;
            if (data.affectedMembers.length > 0) {
                message += ` Affected members: ${data.affectedMembers.join(', ')}`;
            }
            showAlert('modify-slot-alert', message, 'success');
            document.getElementById('modify-slot-form').reset();
        } else {
            showAlert('modify-slot-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('modify-slot-alert', `✗ Network error: ${error.message}`, 'error');
    }
});

// Delete Slot
async function deleteSlot() {
    const slotId = document.getElementById('delete-slot-id').value;

    if (!slotId) {
        showAlert('delete-slot-alert', '✗ Please enter a slot ID', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete slot ${slotId}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/slots/${slotId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('delete-slot-alert', `✓ ${data.message}`, 'success');
            document.getElementById('delete-slot-id').value = '';
        } else {
            showAlert('delete-slot-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('delete-slot-alert', `✗ Network error: ${error.message}`, 'error');
    }
}

// Load Members for a Slot
async function loadSlotMembers() {
    const slotId = document.getElementById('grade-slot-id').value;

    if (!slotId) {
        showAlert('view-slot-members-alert', '✗ Please enter a slot ID', 'error');
        return;
    }

    const displayElement = document.getElementById('slot-members-display');
    displayElement.innerHTML = '<div class="loading">Loading members...</div>';

    try {
        const response = await fetch(`${API_BASE}/slots/${slotId}/members`);
        const data = await response.json();

        if (response.ok) {
            if (data.members.length === 0) {
                displayElement.innerHTML = '<div class="no-data">No members signed up for this slot.</div>';
            } else {
                const title = document.createElement('h3');
                title.textContent = `Slot ${data.slotId} Members (${data.count})`;

                const table = document.createElement('table');
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');

                ['Member ID', 'First Name', 'Last Name', 'Role', 'Signup Time', 'Grade', 'Comment'].forEach(headerText => {
                    const th = document.createElement('th');
                    th.textContent = headerText;
                    headerRow.appendChild(th);
                });

                thead.appendChild(headerRow);
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                data.members.forEach(member => {
                    const row = document.createElement('tr');

                    const tdMemberId = document.createElement('td');
                    tdMemberId.textContent = member.memberId;
                    row.appendChild(tdMemberId);

                    const tdFirstName = document.createElement('td');
                    tdFirstName.textContent = member.firstName;
                    row.appendChild(tdFirstName);

                    const tdLastName = document.createElement('td');
                    tdLastName.textContent = member.lastName;
                    row.appendChild(tdLastName);

                    const tdRole = document.createElement('td');
                    tdRole.textContent = member.role;
                    row.appendChild(tdRole);

                    const tdSignupTime = document.createElement('td');
                    tdSignupTime.textContent = new Date(member.signupTime).toLocaleString();
                    row.appendChild(tdSignupTime);

                    const tdGrade = document.createElement('td');
                    tdGrade.textContent = member.grade !== null ? member.grade : '-';
                    row.appendChild(tdGrade);

                    const tdComment = document.createElement('td');
                    tdComment.textContent = member.comment || '-';
                    tdComment.style.maxWidth = '200px';
                    tdComment.style.whiteSpace = 'pre-wrap';
                    tdComment.style.wordWrap = 'break-word';
                    row.appendChild(tdComment);

                    tbody.appendChild(row);
                });

                table.appendChild(tbody);

                displayElement.innerHTML = '';
                displayElement.appendChild(title);
                displayElement.appendChild(table);

                // Store signup sheet ID for grading form
                document.getElementById('grade-signup-sheet-id').value = data.signupSheetId;
            }
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'no-data';
            errorDiv.textContent = `Error: ${data.error}`;
            displayElement.innerHTML = '';
            displayElement.appendChild(errorDiv);
        }
    } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'no-data';
        errorDiv.textContent = `Network error: ${error.message}`;
        displayElement.innerHTML = '';
        displayElement.appendChild(errorDiv);
    }
}

// Submit Grade
document.getElementById('submit-grade-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const memberId = document.getElementById('grade-member-id').value;
    const signupSheetId = document.getElementById('grade-signup-sheet-id').value;
    const grade = document.getElementById('grade-value').value;
    const comment = document.getElementById('grade-comment').value;

    if (!memberId || !signupSheetId) {
        showAlert('submit-grade-alert', '✗ Please fill in member ID and ensure a slot is selected', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/grades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                memberId: memberId,
                signupSheetId: parseInt(signupSheetId),
                grade: parseInt(grade),
                comment: comment
            })
        });

        const data = await response.json();

        if (response.ok) {
            let message = `✓ ${data.message}.`;
            if (data.originalGrade !== undefined) {
                message += ` Original grade: ${data.originalGrade}`;
            }
            showAlert('submit-grade-alert', message, 'success');

            // Reset form
            document.getElementById('grade-member-id').value = '';
            document.getElementById('grade-value').value = '';
            document.getElementById('grade-comment').value = '';

            // Reload members to show updated grades
            loadSlotMembers();
        } else {
            showAlert('submit-grade-alert', `✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showAlert('submit-grade-alert', `✗ Network error: ${error.message}`, 'error');
    }
});
