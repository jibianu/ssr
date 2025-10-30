// ✅ FIX: Add missing properties and fix name type (should be string, not Date)
export class Category {
    constructor(
        public name?: string,
        public appsName?: string,
        public id?: string | number,
        public sortOrder?: number,
        public showOnDashboard?: boolean
    ) { }
}   