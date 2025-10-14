import { RedirectCommand, Router } from "@angular/router";

export async function redirectToNotFoundPage(router: Router) {
    const tree = router.parseUrl('/page-not-found');
    return new RedirectCommand(tree, { skipLocationChange: true  });
}