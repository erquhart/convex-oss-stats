import { GenericDocument } from "convex/server";
import { WithoutSystemFields } from "convex/server";

export function nullOrWithoutSystemFields<T extends GenericDocument>(
  value: T | null
): WithoutSystemFields<T> | null {
  if (!value) {
    return null;
  }
  const { _id, _creationTime, ...rest } = value;
  return rest as WithoutSystemFields<T>;
}

export const withoutSystemFields = <T extends GenericDocument>(
  value: T
): WithoutSystemFields<T> => {
  const { _id, _creationTime, ...rest } = value;
  return rest as WithoutSystemFields<T>;
};
