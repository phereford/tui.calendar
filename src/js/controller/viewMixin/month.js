/**
 * @fileoverview Controller mixin for Month View
 * @author NHN Ent. FE Development Team <dl_javascript@nhnent.com>
 */
'use strict';
var util = global.tui.util,
    mmax = Math.max;

var array = require('../../common/array'),
    datetime = require('../../common/datetime'),
    Collection = require('../../common/collection');

var Month = {
    /**
     * Filter function for find time event
     * @param {CalEventViewModel} viewModel - event view model
     * @returns {boolean} whether model is time event?
     */
    _onlyTimeFilter: function(viewModel) {
        return !viewModel.model.isAllDay && !viewModel.hasMultiDates;
    },

    /**
     * Filter function for find allday event
     * @param {CalEventViewModel} viewModel - event view model
     * @returns {boolean} whether model is allday event?
     */
    _onlyAlldayFilter: function(viewModel) {
        return viewModel.model.isAllDay || viewModel.hasMultiDates;
    },

    /**
     * Weight top value +1 for month view render
     * @param {CalEventViewModel} viewModel - event view model
     */
    _weightTopValue: function(viewModel) {
        viewModel.top = viewModel.top || 0;
        viewModel.top += 1;
    },

    /**
     * Adjust render range to render properly.
     *
     * Limit starts, ends for each allday events and expand starts, ends for
     * each time events
     * @this Base
     * @param {Date} starts - render start date
     * @param {Date} ends - render end date
     * @param {Collection} vColl - view model collection
     * property.
     */
    _adjustRenderRange: function(starts, ends, vColl) {
        var ctrlCore = this.Core;

        vColl.each(function(viewModel) {
            if (viewModel.model.isAllDay) {
                ctrlCore.limitRenderRange(starts, ends, viewModel);
            }
        });
    },

    /**
     * Get max top index value for allday events in specific date (YMD)
     * @this Base
     * @param {string} ymd - yyyymmdd formatted value
     * @param {Collection} vAlldayColl - collection of allday events
     * @returns {number} max top index value in date
     */
    _getAlldayMaxTopIndexAtYMD: function(ymd, vAlldayColl) {
        var dateMatrix = this.dateMatrix,
            topIndexesInDate = [];
        util.forEach(dateMatrix[ymd], function(cid) {
            vAlldayColl.doWhenHas(cid, function(viewModel) {
                topIndexesInDate.push(viewModel.top);
            });
        });

        if (topIndexesInDate.length > 0) {
            return mmax.apply(null, topIndexesInDate);
        }
        return 0;
    },

    /**
     * Adjust time view model's top index value
     * @this Base
     * @param {Collection} vColl - collection of events
     */
    _adjustTimeTopIndex: function(vColl) {
        var ctrlMonth = this.Month;
        var getAlldayMaxTopIndexAtYMD = ctrlMonth._getAlldayMaxTopIndexAtYMD;
        var vAlldayColl = vColl.find(ctrlMonth._onlyAlldayFilter);
        var sortedTimeEvents = vColl.find(ctrlMonth._onlyTimeFilter).sort(array.compare.event.asc);
        var maxIndexInYMD = {};

        sortedTimeEvents.forEach(function(timeViewModel) {
            var eventYMD = datetime.format(timeViewModel.getStarts(), 'YYYYMMDD');
            var alldayMaxTopInYMD = maxIndexInYMD[eventYMD];

            if (util.isUndefined(alldayMaxTopInYMD)) {
                alldayMaxTopInYMD = maxIndexInYMD[eventYMD] =
                    getAlldayMaxTopIndexAtYMD(eventYMD, vAlldayColl);
            }
            maxIndexInYMD[eventYMD] = timeViewModel.top =
                (alldayMaxTopInYMD + 1);

            if (timeViewModel.top > alldayMaxTopInYMD) {
                return;
            }
        });
    },

    /**
     * Convert multi-date time event to all-day event
     * @this Base
     * @param {Collection} vColl - view model collection
     * property.
     */
    _addMultiDateInfo: function(vColl) {
        vColl.each(function(viewModel) {
            var model = viewModel.model;
            var starts = model.getStarts();
            var ends = model.getEnds();

            viewModel.hasMultiDates = !datetime.isSameDate(starts, ends);

            if (!model.isAllDay && viewModel.hasMultiDates) {
                viewModel.renderStarts = datetime.start(starts);
                viewModel.renderEnds = datetime.end(ends);
            }
        });
    },

    /**
     * Find event and get view model for specific month
     * @this Base
     * @param {Date} starts - start date to find events
     * @param {Date} ends - end date to find events
     * @param {function[]} [andFilters] - optional filters to applying search query
     * @returns {object} view model data
     */
    findByDateRange: function(starts, ends, andFilters) {
        var ctrlCore = this.Core,
            ctrlMonth = this.Month,
            filter = ctrlCore.getEventInDateRangeFilter(starts, ends),
            coll, vColl, vList,
            collisionGroup,
            matrices;

        andFilters = andFilters || [];
        filter = Collection.and.apply(null, [filter].concat(andFilters));

        coll = this.events.find(filter);
        vColl = ctrlCore.convertToViewModel(coll);
        ctrlMonth._adjustRenderRange(starts, ends, vColl);
        ctrlMonth._addMultiDateInfo(vColl);
        vList = vColl.sort(array.compare.event.asc);

        collisionGroup = ctrlCore.getCollisionGroup(vList);
        matrices = ctrlCore.getMatrices(vColl, collisionGroup);
        ctrlCore.positionViewModels(starts, ends, matrices, ctrlMonth._weightTopValue);
        ctrlMonth._adjustTimeTopIndex(vColl);

        return matrices;
    }
};

module.exports = Month;

