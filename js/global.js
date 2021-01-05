
let objectTemplates = [
  {
    type: 'https://schema.org/Message',
    payload: {
      "@context": "https://schema.org",
      "@type": "Message",
      "sender": {
        "@type": "Person",
        "name": "Bugs Bunny"
      },
      "recipient": {
        "@type": "Person",
        "name": "Daffy Duck"
      },
      "about": {
        "@type": "Thing",
        "name": "Duck Season"
      },
      "datePublished": "2016-02-29"
    }
  },
  {
    type: 'https://schema.org/EventReservation',
    payload: {
      "@context": "https://schema.org",
      "@type": "EventReservation",
      "reservationId": "E123456789",
      "reservationStatus": "https://schema.org/ReservationConfirmed",
      "underName": {
        "@type": "Person",
        "name": "John Smith"
      },
      "reservationFor": {
        "@type": "Event",
        "name": "Foo Fighters Concert",
        "startDate": "2017-03-06T19:30:00-08:00",
        "location": {
          "@type": "Place",
          "name": "AT&T Park",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "24 Willie Mays Plaza",
            "addressLocality": "San Francisco",
            "addressRegion": "CA",
            "postalCode": "94107",
            "addressCountry": "US"
          }
        }
      },
      "reservedTicket": {
        "@type": "Ticket",
        "ticketNumber": "abc123",
        "ticketToken": "qrCode:AB34",
        "ticketedSeat": {
          "@type": "Seat",
          "seatRow": "A",
          "seatNumber": "12",
          "seatSection": "101"
        }
      }
    }
  }
];

function generateObjects(count) {
  let objects = [];
  let templateChoices = objectTemplates.length;
  while (count--) {
    objects.push(
      Object.assign({
        nonce: crypto.getRandomValues(new Uint8Array(16)).join('')
      }, objectTemplates[Math.floor(Math.random() * templateChoices)])
    );
  }
  return objects;
}

create_form.addEventListener('submit', e => {
  e.preventDefault();
  fetch('/create', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(generateObjects(count.value || 1))
  }).then(res => {
    console.log(res);
  })
});

function jsonFromArray(array){
 return JSON.parse(String.fromCharCode.apply(null, array))
}

async function refreshList() {
  let objects = await fetch('/objects').then(res => {
    console.log(res.headers.get('X-Sync-Counter'));
    return res.json();
  });
  console.log(objects);

  
  object_list.innerHTML = objects
    .sort((a, b) => a.cid.localeCompare(b.cid))
    .reduce((html, obj) => {
      let json = jsonFromArray(obj.content[0].data);
      return html += `<li>
        <span>${obj.cid}</span> - <span>${json.type}</span>
      </li>`
    }, '')
}

refresh_list.addEventListener('click', e => refreshList());

refreshList();