import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import {
  collection,
  query,
  orderBy,
  startAt,
  endAt,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

export async function queryNearbyPrices(
  barcode,
  centerLat,
  centerLng,
  radiusInM = 5000
) {
  const center = [centerLat, centerLng];
  const bounds = geohashQueryBounds(center, radiusInM);

  const promises = bounds.map(([start, end]) => {
    const q = query(
      collection(db, 'prices'),
      where('barcode', '==', barcode),
      orderBy('geohash'),
      startAt(start),
      endAt(end)
    );
    return getDocs(q);
  });

  const snapshots = await Promise.all(promises);

  const results = [];
  snapshots.forEach((snap) => {
    snap.docs.forEach((doc) => {
      const data = doc.data();
      const distanceInKm = distanceBetween([data.lat, data.lng], center);
      const distanceInM = distanceInKm * 1000;

      if (distanceInM <= radiusInM) {
        results.push({
          id: doc.id,
          ...data,
          distance: Math.round(distanceInM),
        });
      }
    });
  });

  return results.sort((a, b) => a.price - b.price);
}