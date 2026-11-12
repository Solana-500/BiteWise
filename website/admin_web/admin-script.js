// Entry point for every admin page
 
import { startAdminPage } from "./boundary/admin-shell-boundary.js";
 
import { loadDashboardPage } from "./boundary/dashboard-boundary.js";
import { loadCoachesPage } from "./boundary/coaches-boundary.js";
import { loadUsersPage } from "./boundary/users-boundary.js";
import { loadReviewsPage } from "./boundary/reviews-boundary.js";
import { loadLandingPage } from "./boundary/landing-boundary.js";
import { loadContentPage } from "./boundary/content-boundary.js";
import { loadSubscriptionsPage } from "./boundary/subscriptions-boundary.js";
import { loadReportsPage } from "./boundary/reports-boundary.js";
import { loadAuditPage } from "./boundary/audit-boundary.js";
import { loadCategoriesPage } from "./boundary/category-boundary.js";
 
 
// load only the page containing the element of that page
const PAGES = [
    ["#total-users", loadDashboardPage],
    [".coach-tab", loadCoachesPage],
    ["#users-table-body", loadUsersPage],
    ["#moderation-review-list", loadReviewsPage],
    ["#landing-page-editor", loadLandingPage],
    ["#content-table-body", loadContentPage],
    ["#subscription-list-panel", loadSubscriptionsPage],
    ["#report-range", loadReportsPage],
    ["#audit-toolbar", loadAuditPage],
    ["[data-category-content]", loadCategoriesPage]
];
 
 
async function startAdminApp() {
 
    const isAdmin = await startAdminPage();
 
    if (!isAdmin) return;
 
    for (const [selector, loadPage] of PAGES) {
        if (document.querySelector(selector)) {
            await loadPage();
        }
    }
}
 
startAdminApp();