const form = document.getElementById('search-form');
const statusDiv = document.getElementById('status');
const toolbar = document.getElementById('toolbar');
const resultsDiv = document.getElementById('results');
const button = document.getElementById('search-btn');

var allOffers = [];
var currentSort = 'price';
var filterDirect = false;
var filterBaggage = false;
var filterRefundable = false;

function getValue(id) {
    return document.getElementById(id).value;
}

function fmtDuration(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    return h + 'h ' + m + 'm';
}

function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtTime(iso) {
    if (!iso) return '';
    return iso.slice(11, 16);
}

function getBaggageIncluded(offer) {
    var bags = offer.bags_price || {};
    var keys = Object.keys(bags);
    for (var i = 0; i < keys.length; i++) {
        var bag = bags[keys[i]];
        if (bag && bag.included) return bag.included;
    }
    return null;
}

function getBaggageBadges(offer) {
    var badges = [];
    var bags = offer.bags_price || {};
    var keys = Object.keys(bags);
    for (var i = 0; i < keys.length; i++) {
        var bag = bags[keys[i]];
        if (bag && bag.included) {
            badges.push('<span class="badge badge-bag">' + bag.included + '</span>');
        }
    }
    var conds = offer.conditions || {};
    if (conds.refund_before_departure === 'allowed') badges.push('<span class="badge badge-refund">Refundable</span>');
    if (conds.exchange_before_departure === 'allowed') badges.push('<span class="badge badge-change">Changeable</span>');
    return badges.join('');
}

function buildGoogleFlightsUrl(o) {
    var out = o.outbound || {};
    var segs = out.segments || [];
    var origin = segs.length ? segs[0].origin : '';
    var dest = segs.length ? segs[segs.length - 1].destination : '';
    if (!origin || !dest) return '';

    var depDate = segs.length ? segs[0].departure.slice(0, 10) : '';
    if (!depDate) return '';

    var url = 'https://www.google.com/travel/flights?q=Flights+to+' + dest +
        '+from+' + origin +
        '+on+' + depDate;

    var inbound = o.inbound;
    if (inbound) {
        var inSegs = inbound.segments || [];
        var retDate = inSegs.length ? inSegs[0].departure.slice(0, 10) : '';
        if (retDate) url += '+return+' + retDate;
    }

    url += '&curr=' + (o.currency || 'EUR');
    return url;
}

function hasValidBookingUrl(o) {
    var url = o.booking_url;
    if (!url) return false;
    if (url.length < 40) return false;
    if (!url.includes('?')) return false;
    var parts = url.split('?');
    if (parts.length < 2 || parts[1].length < 10) return false;
    return true;
}

function getDurationFromSegments(segments) {
    if (!segments || !segments.length) return 0;
    var first = segments[0];
    var last = segments[segments.length - 1];
    if (!first.departure || !last.arrival) return 0;
    var dep = new Date(first.departure);
    var arr = new Date(last.arrival);
    return (arr - dep) / 1000;
}

function getDuration(o) {
    var out = o.outbound || {};
    var d = out.total_duration_seconds || getDurationFromSegments(out.segments) || 0;
    var inbound = o.inbound;
    if (inbound) {
        d += inbound.total_duration_seconds || getDurationFromSegments(inbound.segments) || 0;
    }
    return d;
}

function getStopovers(o) {
    var out = o.outbound || {};
    var s = out.stopovers != null ? out.stopovers : 0;
    var inbound = o.inbound;
    if (inbound) s += (inbound.stopovers != null ? inbound.stopovers : 0);
    return s;
}

function getDepartureTime(o) {
    var segs = (o.outbound || {}).segments;
    if (segs && segs.length) return segs[0].departure || 'z';
    return 'z';
}

function isDirect(o) {
    var out = o.outbound || {};
    if ((out.stopovers || 0) > 0) return false;
    var inbound = o.inbound;
    if (inbound && (inbound.stopovers || 0) > 0) return false;
    return true;
}

function isRefundable(o) {
    return (o.conditions || {}).refund_before_departure === 'allowed';
}

function filterAndSort() {
    var filtered = allOffers.slice();

    if (filterDirect) {
        filtered = filtered.filter(isDirect);
    }
    if (filterBaggage) {
        filtered = filtered.filter(function(o) { return getBaggageIncluded(o) !== null; });
    }
    if (filterRefundable) {
        filtered = filtered.filter(isRefundable);
    }

    switch (currentSort) {
        case 'price':
            filtered.sort(function(a, b) { return (a.price || 0) - (b.price || 0); });
            break;
        case 'duration':
            filtered.sort(function(a, b) { return getDuration(a) - getDuration(b); });
            break;
        case 'departure_early':
            filtered.sort(function(a, b) { return getDepartureTime(a).localeCompare(getDepartureTime(b)); });
            break;
        case 'departure_late':
            filtered.sort(function(a, b) { return getDepartureTime(b).localeCompare(getDepartureTime(a)); });
            break;
    }

    document.getElementById('filter-count').textContent = filtered.length + ' of ' + allOffers.length;
    renderResults(filtered);
}

function renderResults(offers) {
    if (!offers || !offers.length) {
        resultsDiv.innerHTML = '<div class="empty">No flights match the current filters.</div>';
        return;
    }

    var html = '';

    for (var i = 0; i < offers.length; i++) {
        var o = offers[i];
        var out = o.outbound || {};
        var inbound = o.inbound || null;
        var segs = out.segments || [];
        var hours = Math.floor((out.total_duration_seconds || 0) / 3600);
        var mins = Math.floor(((out.total_duration_seconds || 0) % 3600) / 60);
        if (!out.total_duration_seconds && segs.length) {
            var dur = getDurationFromSegments(segs);
            hours = Math.floor(dur / 3600);
            mins = Math.floor((dur % 3600) / 60);
        }
        var airlines = (o.airlines && o.airlines.length ? o.airlines.join(', ') : (o.owner_airline || 'Unknown'));
        var stops = out.stopovers != null ? out.stopovers : (segs.length > 1 ? segs.length - 1 : '?');

        var priceClass = 'offer-price';
        if (o.price < 100) priceClass += ' cheap';
        else if (o.price < 300) priceClass += ' moderate';

        var badges = getBaggageBadges(o);
        var tierClass = o.source_tier === 'free' ? 'free' : 'paid';
        var tierLabel = o.source_tier === 'free' ? 'free' : '&#9733;';

        var bookUrl = o.booking_url;
        var bookHtml = '';
        if (hasValidBookingUrl(o)) {
            bookHtml = '<a href="' + bookUrl + '" target="_blank" rel="noopener" class="btn-buy">Book Now</a>';
        } else {
            var gfUrl = buildGoogleFlightsUrl(o);
            if (gfUrl) {
                bookHtml = '<a href="' + gfUrl + '" target="_blank" rel="noopener" class="btn-buy btn-buy-alt">Compare on Google Flights</a>';
            } else if (bookUrl) {
                bookHtml = '<a href="' + bookUrl + '" target="_blank" rel="noopener" class="btn-buy btn-buy-alt">Check price</a>';
            }
        }

        if (filterDirect && i === 0) resultsDiv.innerHTML = '';

        html += '<div class="offer-card">' +
            '<div class="offer-top">' +
                '<div class="' + priceClass + '">' +
                    (o.price_formatted || (o.currency + ' ' + o.price)) +
                '</div>' +
                '<div class="offer-actions">' +
                    bookHtml +
                    (o.is_locked ? '<span class="badge badge-locked">Locked</span>' : '') +
                '</div>' +
            '</div>' +

            '<div class="offer-airline">' + airlines +
                ' <span class="source-tier source-' + tierClass + '">' + tierLabel + '</span>' +
            '</div>' +

            '<div class="offer-flight">' +
                renderSegments(segs, hours, mins, stops) +
            '</div>';

        if (inbound) {
            var inSegs = inbound.segments || [];
            var inDur = inbound.total_duration_seconds || getDurationFromSegments(inSegs) || 0;
            var inHours = Math.floor(inDur / 3600);
            var inMins = Math.floor((inDur % 3600) / 60);
            var inStops = inbound.stopovers != null ? inbound.stopovers : (inSegs.length > 1 ? inSegs.length - 1 : '?');
            html += '<div class="offer-flight return-flight">' +
                '<div class="flight-label">Return</div>' +
                renderSegments(inSegs, inHours, inMins, inStops) +
            '</div>';
        }

        if (badges) {
            html += '<div class="offer-badges">' + badges + '</div>';
        }

        html += '<div class="offer-footer">' +
            '<span>Source: ' + (o.source || 'unknown') + '</span>' +
            (o.availability_seats != null ? '<span>Seats: ' + o.availability_seats + '</span>' : '') +
            '<span>ID: ' + (o.id || '') + '</span>' +
        '</div>';

        html += '</div>';
    }

    resultsDiv.innerHTML = html;
}

function renderSegments(segments, hrs, mins, stops) {
    if (!segments || !segments.length) return '';

    var first = segments[0];
    var last = segments[segments.length - 1];
    var departure = fmtTime(first.departure);
    var arrival = fmtTime(last.arrival);
    var origin = first.origin;
    var destination = last.destination;
    var departureStr = fmtDate(first.departure);
    var arrivalStr = fmtDate(last.arrival);

    var html = '<div class="timeline">' +
        '<div class="timeline-point">' +
            '<div class="time">' + departure + '</div>' +
            '<div class="iata">' + origin + '</div>' +
            '<div class="date-sub">' + departureStr + '</div>' +
        '</div>' +
        '<div class="timeline-line">' +
            '<div class="duration-bar">' + hrs + 'h ' + mins + 'm' + (stops > 0 ? ' · ' + stops + ' stop(s)' : ' · Direct') + '</div>' +
            '<div class="line-visual"></div>' +
        '</div>' +
        '<div class="timeline-point">' +
            '<div class="time">' + arrival + '</div>' +
            '<div class="iata">' + destination + '</div>' +
            '<div class="date-sub">' + arrivalStr + '</div>' +
        '</div>' +
    '</div>';

    if (segments.length > 1) {
        html += '<div class="segment-detail">';
        for (var i = 0; i < segments.length; i++) {
            var s = segments[i];
            html += '<div class="segment">' +
                '<span class="seg-flight">' + (s.airline_name || s.airline) + ' ' + (s.flight_no || '') + '</span>' +
                '<span class="seg-route">' + s.origin + ' → ' + s.destination + '</span>' +
                '<span class="seg-time">' + fmtTime(s.departure) + ' – ' + fmtTime(s.arrival) + '</span>' +
                (s.cabin_class ? '<span class="seg-cabin">' + cabinLabel(s.cabin_class) + '</span>' : '') +
            '</div>';
        }
        html += '</div>';
    } else if (segments.length === 1) {
        var s = segments[0];
        html += '<div class="segment-detail single">' +
            '<span class="seg-flight">' + (s.airline_name || s.airline) + ' ' + (s.flight_no || '') + '</span>' +
            (s.cabin_class ? '<span class="seg-cabin">' + cabinLabel(s.cabin_class) + '</span>' : '') +
        '</div>';
    }

    return html;
}

function cabinLabel(code) {
    switch (code) {
        case 'M': return 'Economy';
        case 'W': return 'Premium';
        case 'C': return 'Business';
        case 'F': return 'First';
        default: return code;
    }
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();

    var params = new URLSearchParams({
        origin: getValue('origin').toUpperCase(),
        destination: getValue('destination').toUpperCase(),
        date: getValue('date'),
        adults: getValue('adults'),
        cabin_class: getValue('cabin_class'),
        max_stops: getValue('max_stops'),
        mode: getValue('mode'),
    });

    var returnDate = getValue('return_date');
    if (returnDate) params.set('return_date', returnDate);

    button.disabled = true;
    button.innerHTML = '<span class="btn-spin"></span> Searching...';
    statusDiv.innerHTML = '';
    toolbar.classList.add('hidden');
    resultsDiv.innerHTML = '';

    var startTime = Date.now();

    try {
        var res = await fetch('/api/search?' + params);
        var data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || 'Search failed');
        }

        var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        statusDiv.innerHTML =
            '<span class="found">' + data.total_results + ' offers · ' +
            data.search_params.origin + ' → ' + data.search_params.destination +
            ' · ' + data.search_params.date +
            (data.search_params.return_date ? ' – ' + data.search_params.return_date : '') +
            '</span>' +
            '<span class="elapsed">' + elapsed + 's</span>';

        allOffers = data.offers;
        currentSort = 'price';
        filterDirect = false;
        filterBaggage = false;
        filterRefundable = false;

        document.getElementById('sort-select').value = 'price';
        document.getElementById('filter-direct').checked = false;
        document.getElementById('filter-baggage').checked = false;
        document.getElementById('filter-refundable').checked = false;

        toolbar.classList.remove('hidden');
        filterAndSort();
    } catch (err) {
        statusDiv.innerHTML = '<div class="error">' + err.message + '</div>';
    } finally {
        button.disabled = false;
        button.innerHTML = 'Search';
    }
});

document.getElementById('sort-select').addEventListener('change', function() {
    currentSort = this.value;
    filterAndSort();
});

document.getElementById('filter-direct').addEventListener('change', function() {
    filterDirect = this.checked;
    filterAndSort();
});

document.getElementById('filter-baggage').addEventListener('change', function() {
    filterBaggage = this.checked;
    filterAndSort();
});

document.getElementById('filter-refundable').addEventListener('change', function() {
    filterRefundable = this.checked;
    filterAndSort();
});
