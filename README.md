# portalis

This is a hackaton project for "IV Kongres Polskie Porty 2030" created in 24 hours.

Team: Nadia Zarańska, Artur Tomasiak

Goal: Create a system that would help with the logistical decision making when developing offshore projcets

## the problem

Choosing the right port is a serious problem for offshore project develoeprs. Financial losses and operational delays could occur for reasons relating to:

- lack of cranes reaching lifting and outreach capacity

- berths not meeting the requirements to store required ship

- poor weather conditions

Making a sufficient report on which port is the best candidate for the project is expensive as well as time consuming. The biggest problem is data, which is fragmented and often not publicly available. Having all relevant information about the port, shipowners, available equipments, weather conditions and atmospheric warnings in one place would in itself be valuable. Analysing said data to output which ports are most worth considering would make the process of choosing a port tens of times more efficient.

## the product

 <tr> <td><img src="screenshots/landing-page.png" alt="shrek" height="200"></td> <td><img src="screenshots/search.png" alt="kanji" height="200"></td> <td><img src="screenshots/report.png" alt="abstract art" height="200"></td> </tr> </table>

portalis is one system that handles two applications

**search** - port comparison system; input offshore projet coordinates and port requirements to get a list of ports that meed said requirements from closest to furthest relative to given coordinates alongside forecast data with warnings about the wether whenever applicable.

**report** - document generator summarizing the database information on chosen port; meant for further llm integration

Project's potential lies in search. In cooperation with ports and shipowners, search could be the standard for having all the vital information in one place alongside price estimates 

## techincal details 

All engineering decisions were made with the goal of faster R&D. Production would require:

- database migration (or at least re-implementation) - this app opens sqlite directly from route handler or server component.

- change of environments - node.js won't do for scalable data analysis and mathematics.

The project's only requirement is node.js installed. 'npm instal' within the cloned repository, then 'npm run build' and 'npm run start' to demo the project.

The dabatabase is handled with better-sqlite3 for convinience, the database file, creation scripts as well as inserts are in `/storage`.

The distance is calculated using the Haversine formula, which is a naive point to point measurment that doesn't take under consideration the actual path a ship would take.