angular.module('app', [
    'ngRoute',
    'ngResource',
    'app.controllers',
    'app.services'
]);

angular.module('app').config(function($routeProvider, $locationProvider) {

    $locationProvider.html5Mode(false);

    $routeProvider.when('/turneringer', {
        templateUrl: 'partials/tournaments/tournaments.html',
        controller: 'Tournaments'
    });

    $routeProvider.when('/turneringer/:id', {
        templateUrl: 'partials/tournaments/tournament_edit.html',
        controller: 'TournamentEdit'
    });

    $routeProvider.when('/turneringer/:tournament_id/kamper', {
        templateUrl: 'partials/matches/matches.html',
        controller: 'Matches'
    });

    $routeProvider.when('/turneringer/:tournament_id/kamper/:id', {
        templateUrl: 'partials/matches/match_edit.html',
        controller: 'MatchEdit'
    });

    $routeProvider.when('/lag', {
        templateUrl: 'partials/teams/teams.html',
        controller: 'Teams'
    });

    $routeProvider.when('/lag/:id', {
        templateUrl: 'partials/teams/team_edit.html',
        controller: 'TeamEdit'
    });

    $routeProvider.when('/spillere', {
        templateUrl: 'partials/players/players.html',
        controller: 'Players'
    });

    $routeProvider.when('/spillere/:id', {
        templateUrl: 'partials/players/player_edit.html',
        controller: 'PlayerEdit'
    });

    $routeProvider.otherwise({ redirectTo: '/turneringer' });

});
