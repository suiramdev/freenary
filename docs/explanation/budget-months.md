---
title: How budget months work
description: How the day a budget month starts on decides which month each transaction counts in.
---

This page explains how Freenary splits time into budget months, and why a salary paid at the end of a month can count in the next one. The rules live in `packages/api/src/lib/budget-month.ts`, which the server and the web app share.

## The start day

Each account holder picks the day their budget month starts on, from the 1st to the 28th. Freenary stores it in the `budgetMonthStartDay` column of the `user` table; the default is `1`. The day is set on the **When does your month start?** step of onboarding, and later in **Settings** › **Budget** under **Budget month**.

With the 1st, a budget month is a calendar month. With a later day, each budget month runs from that day to the day before it in the next month. The choice stops at the 28th so that every month has the day.

## Which month a period is named after

A budget month takes the name of the calendar month that holds most of its days:

- From the 2nd to the 15th, the period starts in the month it is named after. With the 5th, **January** runs from 5 January to 4 February.
- From the 16th to the 28th, the period starts in the month before. With the 28th, **February** runs from 28 January to 27 February.

So a salary paid on 28 January counts in February, the month it pays for, together with February's rent and groceries.

## What follows the start day

- The **Transactions** page: the period navigator steps through budget months. **1M** is one budget month, **3M** three, and **1Y** the twelve budget months named after the months of that year. When the start day is not the 1st, the navigator shows the dates the period covers. **Monthly avg.** and **Monthly median** take one value per budget month.
- Home and dashboard widgets that speak of this month: **Spent this month**, **Income this month**, **Saved this month**, **Available to spend** and its end date, **Budgets** and its days left, **Top categories this month**, and the months of **Income vs spending**.
- The months the **Recent transactions** widget reaches back.

## What stays on calendar months

- The **Recurring** page and its monthly charts.
- The **Net worth** history.
- **Spending by week**, which counts weeks.
- The groups of the transaction list.
- The assistant, which asks for exact dates.

## When a change applies

Saving a new start day in **Settings** refetches the budget figures, so open pages show the new periods without a reload. Stored transactions do not change: each request groups them again with the current start day.

## Related

- [First run and the operator](first-run-and-operator.md)
- [How account types change the totals](account-types.md)
