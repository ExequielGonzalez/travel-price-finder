const form = document.getElementById('search-form');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const button = document.getElementById('search-btn');

function getValue(id) {
    return document.getElementById(id).value;
}

function fmtDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h + 'h ' + m + 'm';
}

function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtTime(iso) {
    if (!iso) return '';
    return iso.slice(11, 16);
}

function getRoute(segments) {
    if (!segments || !segments.length) return '';
    const codes = segments.map(function(s) { return s.origin + ' → ' + s.destination; });
    return codes.join(' / ');
}

function getOrigin(segments) {
    return segments && segments.length ? segments[0].origin : '';
}

function getDestination(segments) {
    return segments && segments.length ? segments[segments.length - 1].destination : '';
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const params = new URLSearchParams({
        origin: getValue('origin').toUpperCase(),
        destination: getValue('destination').toUpperCase(),
        date: getValue('date'),
        adults: getValue('adults'),
        cabin_class: getValue('cabin_class'),
        max_stops: getValue('max_stops'),
        mode: getValue('mode'),
    });

    const returnDate = getValue('return_date');
    if (returnDate) params.set('return_date', returnDate);

    button.disabled = true;
    button.innerHTML = '<span class="btn-spin"></span> Searching...';
    statusDiv.innerHTML = '';
    resultsDiv.innerHTML = '';

    const startTime = Date.now();

    try {
        const res = await fetch('/api/search?' + params);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || 'Search failed');
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        statusDiv.innerHTML =
            '<span class="found">' + data.total_results + ' offers · ' +
            data.search_params.origin + ' → ' + data.search_params.destination +
            ' · ' + data.search_params.date +
            (data.search_params.return_date ? ' – ' + data.search_params.return_date : '') +
            '</span>' +
            '<span class="elapsed">' + elapsed + 's</span>';

        renderResults(data.offers);
    } catch (err) {
        statusDiv.innerHTML = '<div class="error">' + err.message + '</div>';
    } finally {
        button.disabled = false;
        button.innerHTML = 'Search';
    }
});

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

function renderResults(offers) {
    if (!offers || !offers.length) {
        resultsDiv.innerHTML = '<div class="empty">No flights found. Try different dates or destinations.</div>';
        return;
    }

    var html = '';

    for (var i = 0; i < offers.length; i++) {
        var o = offers[i];
        var out = o.outbound || {};
        var inbound = o.inbound || null;
        var segs = out.segments || [];
        var hrs = Math.floor((out.total_duration_seconds || 0) / 3600);
        var mins = Math.floor(((out.total_duration_seconds || 0) % 3600) / 60);
        var airlines = (o.airlines && o.airlines.length ? o.airlines.join(', ') : (o.owner_airline || 'Unknown'));
        var stops = out.stopovers != null ? out.stopovers : '?';
        var departureTime = segs.length ? fmtTime(segs[0].departure) : '';
        var arrivalTime = segs.length ? fmtTime(segs[segs.length - 1].arrival) : '';
        var departureDate = segs.length ? fmtDate(segs[0].departure) : '';
        var arrivalDate = segs.length ? fmtDate(segs[segs.length - 1].arrival) : '';

        var priceClass = 'offer-price';
        if (o.price < 100) priceClass += ' cheap';
        else if (o.price < 300) priceClass += ' moderate';

        var badges = getBaggageBadges(o);
        var tierClass = o.source_tier === 'free' ? 'free' : 'paid';
        var tierLabel = o.source_tier === 'free' ? 'free' : '&#9733;';

        html += '<div class="offer-card">' +
            '<div class="offer-top">' +
                '<div class="' + priceClass + '">' +
                    (o.price_formatted || (o.currency + ' ' + o.price)) +
                '</div>' +
                '<div class="offer-actions">' +
                    (o.booking_url ? '<a href="' + o.booking_url + '" target="_blank" rel="noopener" class="btn-buy">Book Now</a>' : '') +
                    (o.is_locked ? '<span class="badge badge-locked">Locked</span>' : '') +
                '</div>' +
            '</div>' +

            '<div class="offer-airline">' + airlines +
                ' <span class="source-tier source-' + tierClass + '">' + tierLabel + '</span>' +
            '</div>' +

            '<div class="offer-flight">' +
                renderSegments(segs, hrs, mins, stops) +
            '</div>';

        if (inbound) {
            var inSegs = inbound.segments || [];
            var inHrs = Math.floor((inbound.total_duration_seconds || 0) / 3600);
            var inMins = Math.floor(((inbound.total_duration_seconds || 0) % 3600) / 60);
            var inStops = inbound.stopovers != null ? inbound.stopovers : '?';
            html += '<div class="offer-flight return-flight">' +
                '<div class="flight-label">Return</div>' +
                renderSegments(inSegs, inHrs, inMins, inStops) +
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
