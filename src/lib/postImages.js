export function storagePathFromUrl(url) {
  const marker = '/post-images/';
  const i = url?.indexOf(marker);
  return i >= 0 ? url.slice(i + marker.length) : null;
}

export async function removePostImage(supabase, imageUrl) {
  const path = storagePathFromUrl(imageUrl);
  if (path) await supabase.storage.from('post-images').remove([path]);
}
