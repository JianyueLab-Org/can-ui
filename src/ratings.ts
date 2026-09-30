/**
 * Rating floors, named.
 *
 * Copied from can-web's `ratingTrans`. A level above ADM has to be added here.
 * can-controller's `nav.ts` and can-portal's `config.ts` import these instead
 * of keeping copies.
 */
export const RATING_INSTRUCTOR = 8;
/** SUP. can-portal's `/super/*` floor. */
export const RATING_SUP = 11;
export const RATING_ADMIN = 12;

/** Rating codes by id, as can-web's `ratingTrans` spells them. The same in every locale. */
export const RATING_SHORT: Readonly<Record<number, string>> = {
  [-1]: "INAC",
  0: "SUS",
  1: "OBS",
  2: "S1",
  3: "S2",
  4: "S3",
  5: "C1",
  6: "C2",
  7: "C3",
  8: "I1",
  9: "I2",
  10: "I3",
  11: "SUP",
  12: "ADM",
};

/** A rating id as its code. An unknown id renders as the number. */
export function ratingShort(rating: number): string {
  return Object.hasOwn(RATING_SHORT, rating)
    ? RATING_SHORT[rating]!
    : String(rating);
}
