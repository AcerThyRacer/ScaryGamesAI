/**
 * Marketplace UI - Phase 2
 * Frontend for player marketplace interactions
 */

// State
let currentPage = 1;
const itemsPerPage = 20;
let currentFilters = {};
let selectedListing = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadMarketplaceStats();
    await loadListings();
});

/**
 * Load marketplace statistics
 */
async function loadMarketplaceStats() {
    try {
        const response = await fetch('/api/v1/marketplace/stats', {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('active-listings').textContent = data.stats.activeListings;
            document.getElementById('auction-listings').textContent = data.stats.auctionListings;
            document.getElementById('avg-price').textContent = `${data.stats.averageSalePrice} 🪙`;
            document.getElementById('active-sellers').textContent = data.stats.activeSellers;
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

/**
 * Load marketplace listings
 */
async function loadListings(page = 1) {
    try {
        const params = new URLSearchParams({
            page,
            limit: itemsPerPage,
            ...currentFilters
        });
        
        const response = await fetch(`/api/v1/marketplace/listings?${params}`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderListings(data.listings);
            renderPagination(data.pagination);
        }
    } catch (error) {
        console.error('Failed to load listings:', error);
        document.getElementById('listings-container').innerHTML = 
            '<div class="loading">Failed to load listings</div>';
    }
}

/**
 * Render listings grid
 */
function renderListings(listings) {
    const container = document.getElementById('listings-container');
    
    if (listings.length === 0) {
        container.innerHTML = '<div class="loading">No listings found</div>';
        return;
    }
    
    container.innerHTML = listings.map(listing => `
        <div class="listing-card rarity-${listing.item_rarity}" onclick="showListingDetails('${listing.id}')">
            <span class="listing-type-badge">${listing.listing_type === 'auction' ? '🔨 Auction' : '💰 Buy Now'}</span>
            <div class="listing-image">
                ${getItemEmoji(listing.item_type)}
            </div>
            <div class="listing-details">
                <h3 class="listing-name">${escapeHtml(listing.item_name)}</h3>
                <div class="listing-info">
                    <span>${listing.item_type}</span>
                    <span>${listing.item_rarity}</span>
                </div>
                <div class="listing-price">
                    ${listing.price_coins > 0 ? `${listing.price_coins} 🪙` : ''}
                    ${listing.price_gems > 0 ? `${listing.price_gems} 💎` : ''}
                    ${listing.listing_type === 'auction' && listing.highest_bid_amount ? 
                        `<br><small>Current Bid: ${listing.highest_bid_amount} 🪙</small>` : ''}
                </div>
                <div style="font-size: 0.8em; opacity: 0.7;">
                    Seller: ${listing.seller_username || 'Unknown'} • 
                    Views: ${listing.views}
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Render pagination
 */
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    const { page, totalPages } = pagination;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = `
        <button class="page-btn" onclick="loadListings(${page - 1})" ${page === 1 ? 'disabled' : ''}>
            ← Prev
        </button>
    `;
    
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        html += `
            <button class="page-btn ${i === page ? 'active' : ''}" onclick="loadListings(${i})">
                ${i}
            </button>
        `;
    }
    
    html += `
        <button class="page-btn" onclick="loadListings(${page + 1})" ${page === totalPages ? 'disabled' : ''}>
            Next →
        </button>
    `;
    
    container.innerHTML = html;
}

/**
 * Apply filters
 */
function applyFilters() {
    currentFilters = {
        item_type: document.getElementById('filter-type').value,
        rarity: document.getElementById('filter-rarity').value,
        listing_type: document.getElementById('filter-listing-type').value,
        search: document.getElementById('filter-search').value
    };
    
    // Remove empty filters
    Object.keys(currentFilters).forEach(key => {
        if (!currentFilters[key]) delete currentFilters[key];
    });
    
    currentPage = 1;
    loadListings(1);
}

/**
 * Reset filters
 */
function resetFilters() {
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-rarity').value = '';
    document.getElementById('filter-listing-type').value = '';
    document.getElementById('filter-search').value = '';
    currentFilters = {};
    loadListings(1);
}

/**
 * Toggle price fields based on listing type
 */
function togglePriceFields() {
    const listingType = document.getElementById('new-listing-type').value;
    const fixedPriceFields = document.getElementById('fixed-price-fields');
    const auctionFields = document.getElementById('auction-fields');
    
    if (listingType === 'fixed_price') {
        fixedPriceFields.style.display = 'block';
        auctionFields.style.display = 'none';
    } else {
        fixedPriceFields.style.display = 'none';
        auctionFields.style.display = 'block';
    }
}

/**
 * Create new listing
 */
async function createListing(event) {
    event.preventDefault();
    
    const listingType = document.getElementById('new-listing-type').value;
    const listingData = {
        item_type: document.getElementById('new-item-type').value,
        item_id: document.getElementById('new-item-id').value,
        item_name: document.getElementById('new-item-name').value,
        item_rarity: document.getElementById('new-item-rarity').value,
        listing_type: listingType
    };
    
    if (listingType === 'fixed_price') {
        listingData.price_coins = parseInt(document.getElementById('new-price-coins').value) || 0;
        listingData.price_gems = parseInt(document.getElementById('new-price-gems').value) || 0;
    } else {
        listingData.auction_start_price = parseInt(document.getElementById('new-auction-start').value) || 0;
        listingData.auction_reserve_price = parseInt(document.getElementById('new-auction-reserve').value) || null;
        listingData.auction_end_time = document.getElementById('new-auction-end').value;
    }
    
    try {
        const response = await fetch('/api/v1/marketplace/listings', {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
                'idempotency-key': generateIdempotencyKey()
            },
            body: JSON.stringify(listingData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Listing created successfully!');
            document.getElementById('create-listing-form').reset();
            switchTab('my-listings');
        } else {
            alert(`Error: ${result.error || 'Failed to create listing'}`);
        }
    } catch (error) {
        console.error('Failed to create listing:', error);
        alert('Failed to create listing');
    }
}

/**
 * Show listing details modal
 */
async function showListingDetails(listingId) {
    try {
        const response = await fetch(`/api/v1/marketplace/listings/${listingId}`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            selectedListing = data.listing;
            showPurchaseModal(data.listing);
        }
    } catch (error) {
        console.error('Failed to load listing details:', error);
    }
}

/**
 * Show purchase modal
 */
function showPurchaseModal(listing) {
    const modal = document.getElementById('purchase-modal');
    const details = document.getElementById('purchase-details');
    
    details.innerHTML = `
        <h3>${escapeHtml(listing.item_name)}</h3>
        <p>Type: ${listing.item_type} | Rarity: ${listing.item_rarity}</p>
        <p>Seller: ${listing.seller_username}</p>
        <div style="font-size: 1.5em; color: var(--gold); margin: 20px 0;">
            ${listing.price_coins > 0 ? `${listing.price_coins} 🪙` : ''}
            ${listing.price_gems > 0 ? `${listing.price_gems} 💎` : ''}
        </div>
        ${listing.listing_type === 'auction' ? 
            '<p>⚠️ This is an auction. Use the bid feature to place a bid.</p>' : 
            '<p>Transaction fee: 5% included in price</p>'}
    `;
    
    modal.classList.add('active');
}

/**
 * Confirm purchase
 */
async function confirmPurchase() {
    if (!selectedListing) return;
    
    try {
        const response = await fetch(`/api/v1/marketplace/listings/${selectedListing.id}/purchase`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
                'idempotency-key': generateIdempotencyKey()
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Purchase successful! Item added to your inventory.');
            closeModal('purchase-modal');
            loadListings(currentPage);
            loadMarketplaceStats();
        } else {
            alert(`Purchase failed: ${result.message || result.error}`);
        }
    } catch (error) {
        console.error('Purchase failed:', error);
        alert('Purchase failed');
    }
}

/**
 * Tab switching
 */
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all tab buttons
    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Set active button
    event.target.classList.add('active');
    
    // Load tab-specific data
    if (tabName === 'my-listings') {
        loadMyListings();
    } else if (tabName === 'trades') {
        loadTrades();
    }
}

/**
 * Load user's listings
 */
async function loadMyListings() {
    // Implementation would fetch user's active listings
    document.getElementById('my-listings-container').innerHTML = 
        '<div class="loading">Feature coming soon...</div>';
}

/**
 * Load trade offers
 */
async function loadTrades() {
    // Implementation would fetch user's trade offers
    document.getElementById('trades-container').innerHTML = 
        '<div class="loading">Feature coming soon...</div>';
}

/**
 * Show create trade modal
 */
function showCreateTradeModal() {
    alert('Trade creation feature coming soon!');
}

/**
 * Close modal
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/**
 * Helper: Get item emoji
 */
function getItemEmoji(itemType) {
    const emojis = {
        cosmetic: '🎭',
        skin: '👤',
        effect: '✨',
        emote: '💃',
        booster: '⚡',
        limited: '👑'
    };
    return emojis[itemType] || '📦';
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Helper: Get auth headers
 */
function getAuthHeaders() {
    const token = localStorage.getItem('authToken') || 'demo-token';
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Helper: Generate idempotency key
 */
function generateIdempotencyKey() {
    return `ui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
