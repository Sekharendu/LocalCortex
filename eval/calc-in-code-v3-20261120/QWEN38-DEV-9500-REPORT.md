# Finance v3 dev run on Qwen 3.8 27B

## Run summary

The run returned 31 answers and refusals from a 565-question dev set, covering 23 calculation questions and 8 lookup controls. Qwen 3.8 27B was used because Cloudflare retired the model used in the earlier benchmark.

Cloudflare reported 8002.06 Neurons. One request timed out and has 824 Neurons reserved because its usage is unknown. That leaves 673.94 Neurons under the 9,500 cap. The remaining prepared requests did not fit the reservation. The earlier synthetic smoke test was a separate 28.2-Neuron request.

Informal review of the 31 outputs found 24 correct, 1 partial, 5 refused and 1 with a disputed denominator. This was a single review of a budget-limited subset. Several references required checking against the passage.

The provider hit its 512-token output limit on three cases. Two became refusals and one was cut off mid-answer. No case triggered the v3 format retry.

## Answers

### financebench-0066 (Correct)

How does Boeing's effective tax rate in FY2022 compare to FY2021?

**Reference.** Effective tax rate in FY2022 was 0.62%, compared to  -14.76% in FY2021.

**Returned answer.** Boeing's effective income tax rate in FY2022 was (0.6)%, compared to 14.8% in FY2021, representing a significant decline from a positive rate to a negative rate.

The company figures in the saved evidence have the opposite signs from the benchmark reference.

### tat-0709 (Correct)

What is the percentage change of basic earnings per share of common stock from 2018 to 2019?

**Reference.** 4.38

**Returned answer.** Basic earnings per share of common stock increased 4.38% from $4.57 in 2018 to $4.77 in 2019.

### tat-0701 (Correct)

What was the average risk-free interest rate for the 3 year period from 2017 to 2019?

**Reference.** 1.77

**Returned answer.** The average risk-free interest rate for the 3-year period from 2017 to 2019 was 2.20%, calculated as the mean of the weighted average risk-free interest rates used to measure the fair value of options granted: 2.1% in 2019, 2.6% in 2018, and 1.9% in 2017.

The source lists two series. The answer identifies the series it used.

### tat-0737 (Correct)

What is the percentage of non-UK activities in loss before income taxes and equity in net loss of affiliates for the year ended December 31, 2019?

**Reference.** 95.48

**Returned answer.** The percentage of non-UK activities in loss before income taxes and equity in net loss of affiliates for the year ended December 31, 2019 was 95.48%, calculated as the non-UK loss of $633 million divided by the total loss of $663 million.

### tat-0636 (Review)

What is the dividend payout ration in year ending June 2018?

**Reference.** 33.33

**Returned answer.** The dividend payout ratio for the fiscal year ended June 2, 2018 was 13.57%, calculated by dividing dividends of $17,093 thousand (from the consolidated statement of stockholders' equity) by net income attributable to Cal-Maine Foods, Inc. of $125,932 thousand for the same period.

13.57% uses total earnings and the reference uses earnings available for dividend.

### tat-0773 (Correct)

What is the change in Net (loss) income from Year Ended December 31, 2019 to December 31, 2018?

**Reference.** -91239

**Returned answer.** Net (loss) income changed by -91,239 thousand U.S. dollars from Year Ended December 31, 2018 (a loss of $57,747 thousand) to Year Ended December 31, 2019 (a loss of $148,986 thousand), representing an increase in the net loss.

### tat-0775 (Correct)

What is the change in Deferred tax assets: Other from December 31, 2019 to December 31, 2018?

**Reference.** 9129

**Returned answer.** Deferred tax assets: Other changed by 9,129 thousand U.S. dollars, from 10,545 at December 31, 2018 to 19,674 at December 31, 2019.

### tat-0623 (Correct)

What was the increase / (decrease) in the net loss from 2018 to 2019?

**Reference.** -4814

**Returned answer.** The net loss increased by 4,814 thousand dollars from fiscal 2018 to fiscal 2019, going from $8,350 thousand in 2018 to $13,164 thousand in 2019.

### tat-0620 (Correct)

What was the average 2019 third quarter for high and low?

**Reference.** 15.45

**Returned answer.** The average of the 2019 third quarter high and low sales prices was 15.45, calculated from the high of $17.02 and the low of $13.88 for the third quarter of fiscal 2019.

### tat-0767 (Correct)

What was the percentage change in Income taxes receivable in 2019 from 2018?

**Reference.** 71.51

**Returned answer.** Income taxes receivable changed 71.51% from $916 thousand in 2018 to $1,571 thousand in 2019.

### financebench-0060 (Partial)

Are there any product categories / service categories that represent more than 20% of Boeing's revenue for FY2022?

**Reference.** Yes. Boeing has product and service categories that represent more than 20% of Boeing's revenue for FY2022. These categories are Commercial Airplanes which comprises 39% of total revenue, Defence which comprises 35% of total revenue and Services which comprises 26% of total revenue.

**Returned answer.** Yes. Three of Boeing's four reportable segments each represented more than 20% of total FY2022 revenues of $66,608 million:

- **Commercial Airplanes (BCA)**: $25,867 million, or 38.83% of total revenues
- **Defense, Space & Security (BDS)**: $2

Identified three qualifying segments but the list was cut off.

### tat-0648 (Correct)

What is the total earnings in 2019?

**Reference.** 4570576.14

**Returned answer.** The total earnings (net income) for Clearfield, Inc. in fiscal year 2019 was **$4,566,156**, which equates to $0.34 per basic and diluted share.

The reported net income agrees with the source. The reference derives an approximation from rounded earnings per share.

### tat-0660 (Correct)

What is the average Operating income for each quarter in 2019?

**Reference.** 20320.25

**Returned answer.** The average Operating income for each quarter in 2019 was 20,320.25 thousand dollars, calculated from the quarterly operating income figures of $16,720 thousand (Q1), $14,300 thousand (Q2), $23,542 thousand (Q3), and $26,719 thousand (Q4).

### tat-0724 (Refused)

What is the percentage change in the total reserves from 2018 to 2019?

**Reference.** 8.85

**Returned answer.** The provided context is insufficient to answer this question.

Verifier rejected unit conversion in prose.

### financebench-0101 (Correct)

What is Lockheed Martin's FY2021 net working capital? Define net working capital as total current assets less total current liabilities. Answer in USD millions. Respond to the question by assuming the perspective of an investment analyst who can only use the details shown within the balance sheet.

**Reference.** $5818.00

**Returned answer.** Lockheed Martin's FY2021 net working capital was 5,818 million, calculated as total current assets of $19,815 million minus total current liabilities of $13,997 million, as reported on the consolidated balance sheet as of December 31, 2021.

### tat-0788 (Correct)

How much is the change in additions of financial assets from 2018 to 2019?

**Reference.** -12069

**Returned answer.** The change in additions of financial assets (Level 3) from 2018 to 2019 was -12,069 RMB million, calculated as 39,116 (2019) minus 51,185 (2018).

### tat-0633 (Refused)

What is the percentage change in the finance costs expensed from 2018 to 2019?

**Reference.** 222.58

**Returned answer.** The provided context is insufficient to answer this question.

Verifier rejected unit conversion in prose.

### tat-0725 (Refused)

What is the percentage change in the revenue in Asia from 2018 to 2019?

**Reference.** 125.71

**Returned answer.** The provided context is insufficient to answer this question.

Verifier rejected unit conversion in prose.

### tat-0714 (Correct)

What is the increase/ (decrease) in External Systems Hardware gross profit from 2017 to 2018

**Reference.** -303

**Returned answer.** External Systems Hardware gross profit decreased by -303 million (from $2,893 million in 2017 to $2,590 million in 2018), a year-to-year decline of (10.5)%.

### financebench-0054 (Refused)

Was there any change in the number of Best Buy stores between Q2 of FY2024 and FY2023?

**Reference.** Yes, there is decline in number stores by 1.32% from 982 stores in Q2 FY 2023 to 969 by the end of Q2 FY2024.

**Returned answer.** The provided context is insufficient to answer this question.

Provider reached its output limit with no answer prose.

### tat-0769 (Correct)

What was the percentage change in Transportation equipment in 2019 from 2018?

**Reference.** -3.62

**Returned answer.** Transportation equipment decreased -3.62% from $636 thousand in 2018 to $613 thousand in 2019.

### tat-0742 (Correct)

What is the average Net deferred tax liabilities for December 31, 2018 to 2019?

**Reference.** 73099

**Returned answer.** The average Net deferred tax liabilities for December 31, 2018 to 2019 was 73,099, calculated by averaging the December 31, 2019 value of $72,833 and the December 31, 2018 value of $73,365.

### financebench-0114 (Refused)

We need to calculate a reasonable approximation (or exact number if possible) of a financial metric. Basing your judgment by information plainly provided in the statement of income, what is Nike's three year average of cost of goods sold as a % of revenue from FY2016 to FY2018? Answer in units of percents and round to one decimal place.

**Reference.** 55.1%

**Returned answer.** The provided context is insufficient to answer this question.

Provider reached its output limit with no answer prose.

### nq-0334 (Correct)

what is the most current version of robert's rules of order

**Reference.** The 11th and

**Returned answer.** The most current version of Robert's Rules of Order is the **Eleventh Edition**, published in 2011 under the title *Robert's Rules of Order Newly Revised*. It became effective on September 23, 2011, and supersedes all previous editions.

### nq-0163 (Correct)

how many passengers does an airbus a321 hold

**Reference.** 236 passengers

**Returned answer.** The Airbus A321 holds up to 236 passengers in a single-class maximum seating configuration at 28 in (71 cm) pitch. In a typical single-class layout at 32 in (81 cm) pitch, it carries 199 passengers, and in a typical two-class layout it carries 185 passengers (16 first-class at 36 in and 169 economy at 32 in).

### tat-0663 (Correct)

When is an account considered to be delinquent?

**Reference.** if there are unpaid charges remaining on the account on the day after the bill’s due date.

**Returned answer.** An account is considered to be delinquent and in default status if there are unpaid charges remaining on the account on the day after the bill's due date.

### nq-0191 (Correct)

where did destiny's child name come from

**Reference.** a passage in the Book of Isaiah.

**Returned answer.** Destiny's Child's name was taken from a passage in the Book of Isaiah. The group changed their name to Destiny's Child in 1996.

### tat-0738 (Correct)

What is the amount of non-UK  income loss before income taxes and equity in net income of affiliates for the year ended December 31, 2018?

**Reference.** 885

**Returned answer.** The non-UK loss before income taxes and equity in net income of affiliates for the year ended December 31, 2018 was $(885) million.

### nq-0248 (Correct)

who plays mona in who's the boss

**Reference.** Katherine Marie Helmond (

**Returned answer.** Katherine Helmond played the role of Mona Robinson on *Who's the Boss?* from 1984 to 1992, appearing in 196 episodes.

### tat-0646 (Correct)

What is the Advertising costs for the year ended September 30, 2019?

**Reference.** $278,057

**Returned answer.** Advertising costs for the year ended September 30, 2019 were $278,057.

### nq-0348 (Correct)

which country has the largest land area in south america

**Reference.** Brazil is

**Returned answer.** Brazil is the country with the largest land area in South America, at 8,514,877 km² (3,287,612 sq mi), encompassing around half of the continent's land area.

### tat-0776 (timed out)

Cloudflare returned no answer or usage for this request.

