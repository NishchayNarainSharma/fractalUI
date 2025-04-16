// Fetch and display thoughts
async function fetchThoughts() {
    try {
        const response = await fetch('/api/thoughts');
        const thoughts = await response.json();
        const container = document.getElementById('thoughtsContainer');
        
        if (!container) return;
        
        container.innerHTML = thoughts.map(thought => `
            <div class="glass-card thought-card animate-in" data-id="${thought._id}">
                <div class="thought-content">
                    <p>${thought.content}</p>
                    <small class="thought-meta">- ${thought.author}, ${new Date(thought.createdAt).toRelativeTime()}</small>
                </div>
                <div class="thought-actions">
                    <div class="vote-buttons">
                        <button class="vote-button upvote" onclick="vote('${thought._id}', 'up')">
                            <i class="fas fa-arrow-up"></i>
                            <span>${thought.upvotes}</span>
                        </button>
                        <button class="vote-button downvote" onclick="vote('${thought._id}', 'down')">
                            <i class="fas fa-arrow-down"></i>
                            <span>${thought.downvotes}</span>
                        </button>
                    </div>
                    <button class="vote-button" onclick="toggleComments('${thought._id}')">
                        <i class="fas fa-comment"></i>
                        <span>Comments (${thought.comments.length})</span>
                    </button>
                </div>
                <div class="comments-section" style="display: none;">
                    ${thought.comments.map(comment => `
                        <div class="comment">
                            <p>${comment.content}</p>
                            <small>- ${comment.author}, ${new Date(comment.createdAt).toRelativeTime()}</small>
                        </div>
                    `).join('')}
                    <form class="comment-form" onsubmit="submitComment(event, '${thought._id}')">
                        <div class="form-group">
                            <input type="text" class="form-input" placeholder="Add a comment...">
                        </div>
                    </form>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error fetching thoughts:', err);
    }
}

// Submit a new thought
async function submitThought(event) {
    event.preventDefault();
    const form = event.target;
    const content = form.querySelector('textarea').value;
    
    try {
        const response = await fetch('/api/thoughts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            form.reset();
            await fetchThoughts();
        }
    } catch (err) {
        console.error('Error submitting thought:', err);
    }
}

// Vote on a thought
async function vote(thoughtId, voteType) {
    try {
        const response = await fetch(`/api/thoughts/${thoughtId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ voteType })
        });
        
        if (response.ok) {
            await fetchThoughts();
        }
    } catch (err) {
        console.error('Error voting:', err);
    }
}

// Submit a comment
async function submitComment(event, thoughtId) {
    event.preventDefault();
    const form = event.target;
    const content = form.querySelector('input').value;
    
    try {
        const response = await fetch(`/api/thoughts/${thoughtId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            form.reset();
            await fetchThoughts();
        }
    } catch (err) {
        console.error('Error submitting comment:', err);
    }
}

// Toggle comments section
function toggleComments(thoughtId) {
    const card = document.querySelector(`[data-id="${thoughtId}"]`);
    const comments = card.querySelector('.comments-section');
    comments.style.display = comments.style.display === 'none' ? 'block' : 'none';
}

// Relative time formatter
Date.prototype.toRelativeTime = function() {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = (this - new Date()) / 1000;
    
    if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second');
    if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchThoughts();
    
    // Set up form listeners
    const thoughtForm = document.getElementById('thoughtForm');
    if (thoughtForm) {
        thoughtForm.addEventListener('submit', submitThought);
    }
    
    // Animation on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    });

    document.querySelectorAll('.glass-card').forEach((card) => {
        observer.observe(card);
    });
}); 