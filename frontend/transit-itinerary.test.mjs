import assert from 'node:assert/strict';
import test from 'node:test';
import { formatScheduleTime, groupBusLegs } from './transit-itinerary.js';

test('grouped bus legs retain their arrival day when a ride crosses midnight', () => {
  const [ride] = groupBusLegs([
    {
      mode: 'bus', busRoute: '80', from: 'a', to: 'b', fromName: 'A', toName: 'B',
      departureTime: '23:50', arrivalTime: '23:59',
      departureDayOffset: 0, arrivalDayOffset: 0, miles: 1, minutes: 9,
    },
    {
      mode: 'bus', busRoute: '80', from: 'b', to: 'c', fromName: 'B', toName: 'C',
      departureTime: '00:00', arrivalTime: '00:08',
      departureDayOffset: 1, arrivalDayOffset: 1, miles: 1, minutes: 8,
    },
  ]);

  assert.equal(ride.from, 'a');
  assert.equal(ride.to, 'c');
  assert.equal(ride.arrivalDayOffset, 1);
  assert.equal(formatScheduleTime(ride.arrivalTime, ride.arrivalDayOffset), '00:08 (+1 day)');
});
