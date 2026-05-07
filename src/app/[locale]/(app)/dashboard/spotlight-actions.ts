'use server';

import { revalidatePath } from 'next/cache';
import { dismissSpotlight } from '@/lib/queries/feature-spotlight';

export async function dismissSpotlightAction(id: string) {
  await dismissSpotlight(id);
  revalidatePath('/dashboard');
}
