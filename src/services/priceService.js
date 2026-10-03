import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { geohashForLocation } from 'geofire-common';

export async function submitPrice({
  barcode,
  productName,
  brand,
  price,
  currency,
  storeName,
  lat,
  lng,
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Пользователь не аутентифицирован');
  
  const geohash = geohashForLocation([lat, lng]);
  
  const priceData = {
    barcode,
    productName,
    brand,
    price: Number(price),
    currency,
    storeName,
    lat,
    lng,
    geohash,
    userId: user.uid,
    timestamp: serverTimestamp(),
    verified: false,
  };
  
  const docRef = await addDoc(collection(db, 'prices'), priceData);
  return docRef.id;
}