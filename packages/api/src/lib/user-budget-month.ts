import prisma from "@freenary/db";

export const userBudgetMonthStartDay = async (
  userId: string
): Promise<number> => {
  const user = await prisma.user.findUniqueOrThrow({
    select: { budgetMonthStartDay: true },
    where: { id: userId },
  });

  return user.budgetMonthStartDay;
};
