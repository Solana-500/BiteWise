import {
    getLandingDraft,
    uploadLandingHeroImage,
    saveHeroDraft,
    saveFeaturesDraft,
    saveHowItWorksDraft,
    saveFeaturedReviewsDraft,
    saveFeaturedCoachesDraft,
    savePlansDraft,
    publishLandingDraft
} from "../entity/landing-entity.js";
 
import {
    loadApprovedCoachesForLanding
} from "./coach-controller.js";

import {
    loadPublishedReviewsForLanding
} from "./review-controller.js";

export async function loadLandingDraft() {
    return await getLandingDraft();
}

export async function uploadLandingHeroImageFile(file) {
    return await uploadLandingHeroImage(file);
}

export async function saveLandingHero(hero) {
    return await saveHeroDraft(hero);
}

export async function saveLandingFeatures(features) {
    return await saveFeaturesDraft(features);
}

export async function saveLandingHowItWorks(howItWorks) {
    return await saveHowItWorksDraft(howItWorks);
}

export async function saveLandingFeaturedCoaches(featuredCoaches) {
    return await saveFeaturedCoachesDraft(featuredCoaches);
}

export async function loadLandingFeaturedCoaches() {
    return await loadApprovedCoachesForLanding();
}

export async function saveLandingPlans(plans) {
    return await savePlansDraft(plans);
}

export async function publishLandingPage() {
    return await publishLandingDraft();
}

export async function loadLandingFeaturedReviews() {
    return await loadPublishedReviewsForLanding();
}

export async function saveLandingFeaturedReviews(featuredReviews) {
    return await saveFeaturedReviewsDraft(featuredReviews);
}