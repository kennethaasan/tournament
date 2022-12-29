<?php


use \Faker\Factory as Faker;

class DatabaseSeeder extends Seeder {

    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Eloquent::unguard();

        $this->call('UserTableSeeder');
        $this->command->info('User table seeded!');

        $this->call('TournamentTableSeeder');
        $this->command->info('Tournament table seeded!');

        $this->call('TeamsTableSeeder');
        $this->command->info('Team table seeded!');

        $this->call('MatchesTableSeeder');
        $this->command->info('Match table seeded!');

        /*$this->call('PlayersTableSeeder');
        $this->command->info('Player table seeded!');

        $this->call('GoalsTableSeeder');
        $this->command->info('Goal table seeded!');*/

    }

}

class UserTableSeeder extends Seeder {

    public function run()
    {
        DB::table('users')->delete();

        User::create(array(
            'email' => 'admin@admin.no',
            'password' => Hash::make('admin'),
            'admin' => true
        ));

        User::create(array(
            'email' => 'admin2@admin2.no',
            'password' => Hash::make('admin2'),
            'admin' => true
        ));

    }
}

class TournamentTableSeeder extends Seeder {

    public function run()
    {
        DB::table('tournaments')->delete();

        Tournament::create(array(
            'name' => 'Vanvikan Julecup 2022',
            'date' => '2022-12-30',
            'location' => 'Vanvikanhallen'
        ));

        // Tournament::create(array(
        //     'name' => 'Vanvikan Indoor G16',
        //     'date' => '2020-02-29',
        //     'location' => 'Vanvikanhallen'
        // ));

        // Tournament::create(array(
        //     'name' => 'Vanvikan Indoor J17',
        //     'date' => '2020-03-01',
        //     'location' => 'Vanvikanhallen'
        // ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        // Team::create(array('name' => 'Vinner gruppe A')); //1
        // Team::create(array('name' => '2. plass gruppe A')); //2

        // Team::create(array('name' => 'Vinner gruppe B')); //3
        // Team::create(array('name' => '2. plass gruppe B')); //4

        // Team::create(array('name' => 'Vinner gruppe C')); //5
        // Team::create(array('name' => '2. plass gruppe C')); //6

        // Team::create(array('name' => 'Vinner gruppe D')); //7
        // Team::create(array('name' => '2. plass gruppe D')); //8

        // Team::create(array('name' => 'Vinner Q1')); //9
        // Team::create(array('name' => 'Vinner Q2')); //10
        // Team::create(array('name' => 'Vinner Q3')); //11
        // Team::create(array('name' => 'Vinner Q4')); //12

        // Team::create(array('name' => 'Vinner S1')); //13
        // Team::create(array('name' => 'Vinner S2')); //14

        // Team::create(array('name' => 'Tapende lag S1')); //15
        // Team::create(array('name' => 'Tapende lag S2')); //16

        // Team::create(array('name' => '3. plass gruppe A')); //17
        // Team::create(array('name' => '4. plass gruppe A')); //18

        // Team::create(array('name' => '3. plass gruppe B')); //19
        // Team::create(array('name' => '4. plass gruppe B')); //20

        // Team::create(array('name' => 'Beste tredjeplass')); //21
        // Team::create(array('name' => 'Nest beste tredjeplass')); //22



        // Team::create(array('name' => 'Astor FK 1', 'group_code' => 'A'));
        // Team::create(array('name' => 'Leksvik IL 1', 'group_code' => 'A'));
        // Team::create(array('name' => 'SPKL Freidig 2', 'group_code' => 'A'));
        // Team::create(array('name' => 'Malvik IL 2', 'group_code' => 'A'));
        // Team::create(array('name' => 'Astor FK 4', 'group_code' => 'A'));

        // Team::create(array('name' => 'Stadsbygd/Vanvik 1', 'group_code' => 'B'));
        // Team::create(array('name' => 'Astor FK 2', 'group_code' => 'B'));
        // Team::create(array('name' => 'Leksvik IL 2', 'group_code' => 'B'));
        // Team::create(array('name' => 'SPKL Freidig 3', 'group_code' => 'B'));
        // Team::create(array('name' => 'SPKL Freidig 3', 'group_code' => 'B'));

        // Team::create(array('name' => 'Malvik IL 1', 'group_code' => 'C'));
        // Team::create(array('name' => 'SPKL Freidig 1', 'group_code' => 'C'));
        // Team::create(array('name' => 'Astor FK 3', 'group_code' => 'C'));
        // Team::create(array('name' => 'Stadsbygd/Vanvik 2', 'group_code' => 'C'));
        // Team::create(array('name' => 'Stadsbygd/Vanvik 2', 'group_code' => 'C'));

        $a = array("Stadsbygd", "Rissa");

        foreach ($a as &$teamName) {
            Team::create(array('name' => $teamName, 'group_code' => 'A'));
        }

        // Team::create(array('name' => 'Nardo FK 1', 'group_code' => 'A'));
        // Team::create(array('name' => 'Leksvik IL 1', 'group_code' => 'A'));
        // Team::create(array('name' => 'Flatås IL 2', 'group_code' => 'A'));
        // Team::create(array('name' => 'Malvik IL 2', 'group_code' => 'A'));
        // Team::create(array('name' => 'Vanvik 3', 'group_code' => 'A'));

        // Team::create(array('name' => 'Vanvik 1', 'group_code' => 'B'));
        // Team::create(array('name' => 'FK Fosen', 'group_code' => 'B'));
        // Team::create(array('name' => 'Skaun BK 2', 'group_code' => 'B'));
        // Team::create(array('name' => 'Nardo FK 3', 'group_code' => 'B'));

        // Team::create(array('name' => 'Skaun BK 1', 'group_code' => 'C'));
        // Team::create(array('name' => 'Flatås IL 1', 'group_code' => 'C'));
        // Team::create(array('name' => 'Nardo FK 2', 'group_code' => 'C'));
        // Team::create(array('name' => 'Leksvik IL 2', 'group_code' => 'C'));

        // Team::create(array('name' => 'Malvik IL 1', 'group_code' => 'D'));
        // Team::create(array('name' => 'Buvik IL', 'group_code' => 'D'));
        // Team::create(array('name' => 'Vanvik 2', 'group_code' => 'D'));
        // Team::create(array('name' => 'Nardo FK 4', 'group_code' => 'D'));



        // Team::create(array('name' => 'Gimse IL 1', 'group_code' => 'A'));
        // Team::create(array('name' => 'Gimse IL 2', 'group_code' => 'A'));
        // Team::create(array('name' => 'Stadsbygd IL', 'group_code' => 'A'));
        // Team::create(array('name' => 'Åfjord 1', 'group_code' => 'A'));
        // Team::create(array('name' => 'Åfjord 2', 'group_code' => 'A'));



        // Team::create(array('name' => 'Stadsbygd IL 1', 'group_code' => 'A'));
        // Team::create(array('name' => 'Skaun BK', 'group_code' => 'A'));
        // Team::create(array('name' => 'SPKL Freidig', 'group_code' => 'A'));
        // Team::create(array('name' => 'Kattem IL 2', 'group_code' => 'A'));

        // Team::create(array('name' => 'Kattem IL 1', 'group_code' => 'B'));
        // Team::create(array('name' => 'Trygg/Lade', 'group_code' => 'B'));
        // Team::create(array('name' => 'Stadsbygd IL 2', 'group_code' => 'B'));
        // Team::create(array('name' => 'Kattem IL 3', 'group_code' => 'B'));
    }
}

class PlayersTableSeeder extends Seeder {

    public function run()
    {
        DB::table('players')->delete();

        $faker = Faker::create();

        foreach (range(1, 200) as $index) {
            Player::create(array(
                'name' => $faker->name(),
                'number' => $faker->numberBetween(1, 99),
                'paid' => $faker->boolean(),
                'team_id' => $faker->numberBetween(1, 20)
            ));
        }

    }
}

class MatchesTableSeeder extends Seeder {

    public function run() {

        DB::table('matches')->delete();

        // $this->generateTournamentWith16TeamsAtMorning(1, 21);
        $this->generateTournamentCustomG14(1, 23);
        $this->generateTournamentWith16TeamsAtNight(2, 23 + 13);

        // $this->generateTournamentCustomJ14AndJ15(3, 21 + 11 + 16);
        $this->generateTournamentCustomJ17(4, 23 + 13 + 17);

        // $this->generateTournamentCustom(3, 21 + 16 + 16 + 16);

    }

    // private function generateTournamentCustom($tournament_id, $team_id) {
    //     $this->generateMatch($tournament_id, '09:00', 1, 'A', $team_id, $team_id + 1);
    //     $this->generateMatch($tournament_id, '09:00', 2, 'A', $team_id + 4, $team_id + 3);
    //
    //     $this->generateMatch($tournament_id, '09:20', 1, 'B', $team_id + 6, $team_id + 7);
    //     $this->generateMatch($tournament_id, '09:20', 2, 'B', $team_id + 10, $team_id + 8);
    //
    //     $this->generateMatch($tournament_id, '09:40', 1, 'A', $team_id + 3, $team_id);
    //     $this->generateMatch($tournament_id, '09:40', 2, 'A', $team_id + 5, $team_id + 4);
    //
    //     $this->generateMatch($tournament_id, '10:00', 2, 'A', $team_id + 1, $team_id + 2);
    //     $this->generateMatch($tournament_id, '10:00', 2, 'B', $team_id + 10, $team_id + 6);
    //
    //     $this->generateMatch($tournament_id, '10:20', 1, 'A', $team_id, $team_id + 4);
    //     $this->generateMatch($tournament_id, '10:20', 2, 'A', $team_id + 5, $team_id + 3);
    //
    //     $this->generateMatch($tournament_id, '10:40', 1, 'B', $team_id + 9, $team_id + 7);
    //     $this->generateMatch($tournament_id, '10:40', 2, 'B', $team_id + 6, $team_id + 8);
    //
    //     $this->generateMatch($tournament_id, '11:00', 1, 'A', $team_id + 1, $team_id + 4);
    //     $this->generateMatch($tournament_id, '11:00', 2, 'A', $team_id, $team_id + 2);
    //
    //     $this->generateMatch($tournament_id, '11:20', 1, 'B', $team_id + 9, $team_id + 10);
    //     $this->generateMatch($tournament_id, '11:20', 2, 'B', $team_id + 7, $team_id + 8);
    //
    //     $this->generateMatch($tournament_id, '11:40', 1, 'A', $team_id + 2, $team_id + 3);
    //     $this->generateMatch($tournament_id, '11:40', 2, 'A', $team_id + 5, $team_id + 1);
    //
    //     $this->generateMatch($tournament_id, '12:00', 1, 'B', $team_id + 9, $team_id + 6);
    //     $this->generateMatch($tournament_id, '12:00', 2, 'B', null, null);
    //
    //     $this->generateMatch($tournament_id, '12:20', 1, 'A', $team_id + 4, $team_id + 2);
    //     $this->generateMatch($tournament_id, '12:20', 2, 'A', $team_id + 5, $team_id);
    //
    //     $this->generateMatch($tournament_id, '12:40', 1, 'B', $team_id + 7, $team_id + 10);
    //     $this->generateMatch($tournament_id, '12:40', 2, 'B', $team_id + 8, $team_id + 9);
    //
    //     $this->generateMatch($tournament_id, '13:00', 1, 'A', $team_id + 3, $team_id + 1);
    //     $this->generateMatch($tournament_id, '13:00', 2, 'A', $team_id + 2, $team_id + 5);
    //
    //
    //     $this->generateMatch($tournament_id, '13:20', 1, 'Q1', 1, 19);
    //     $this->generateMatch($tournament_id, '13:20', 2, 'Q2', 2, 20);
    //
    //     $this->generateMatch($tournament_id, '13:40', 1, 'Q3', 3, 17);
    //     $this->generateMatch($tournament_id, '13:40', 2, 'Q4', 4, 18);
    //
    //     $this->generateMatch($tournament_id, '14:00', 1, 'S1', 9, 10);
    //     $this->generateMatch($tournament_id, '14:00', 2, 'S2', 11, 12);
    //
    //     $this->generateMatch($tournament_id, '14:20', 1, 'F', 13, 14);
    //     $this->generateMatch($tournament_id, '14:20', 2, 'BF', 15, 16);
    // }

    private function generateTournamentCustomJ14AndJ15($tournament_id, $team_id) {
        $this->generateMatch($tournament_id, '10:00', 1, 'B', $team_id + 7, $team_id + 5);
        $this->generateMatch($tournament_id, '10:00', 2, 'B', $team_id + 6, $team_id + 9);

        $this->generateMatch($tournament_id, '10:20', 1, 'B', $team_id + 8, $team_id + 10);
        $this->generateMatch($tournament_id, '10:20', 2, 'A', $team_id, $team_id + 3);  
        
        $this->generateMatch($tournament_id, '10:40', 1, 'A', $team_id + 1, $team_id + 2);
        $this->generateMatch($tournament_id, '10:40', 2, 'B', $team_id + 6, $team_id + 11);  

        $this->generateMatch($tournament_id, '11:00', 1, 'B', $team_id + 5, $team_id + 8);
        $this->generateMatch($tournament_id, '11:00', 2, 'B', $team_id + 9, $team_id + 7);

        $this->generateMatch($tournament_id, '11:20', 1, 'A', $team_id, $team_id + 1);
        $this->generateMatch($tournament_id, '11:20', 2, 'A', $team_id + 4, $team_id + 2);
        
        $this->generateMatch($tournament_id, '11:40', 1, 'B', $team_id + 11, $team_id + 5);
        $this->generateMatch($tournament_id, '11:40', 2, 'B', $team_id + 7, $team_id + 8);

        $this->generateMatch($tournament_id, '12:00', 1, 'B', $team_id + 10, $team_id + 6);
        $this->generateMatch($tournament_id, '12:00', 2, 'A', $team_id + 4, $team_id);  

        $this->generateMatch($tournament_id, '12:20', 1, 'A', $team_id + 3, $team_id + 1);
        $this->generateMatch($tournament_id, '12:20', 2, 'B', $team_id + 11, $team_id + 7);  

        $this->generateMatch($tournament_id, '12:40', 1, 'B', $team_id + 10, $team_id + 9);
        $this->generateMatch($tournament_id, '12:40', 2, 'B', $team_id + 5, $team_id + 6);

        $this->generateMatch($tournament_id, '13:00', 1, 'A', $team_id + 2, $team_id);
        $this->generateMatch($tournament_id, '13:00', 2, 'A', $team_id + 3, $team_id + 4);

        $this->generateMatch($tournament_id, '13:20', 1, 'B', $team_id + 8, $team_id + 6);
        $this->generateMatch($tournament_id, '13:20', 2, 'B', $team_id + 5, $team_id + 10);

        $this->generateMatch($tournament_id, '13:40', 1, 'B', $team_id + 11, $team_id + 9);
        $this->generateMatch($tournament_id, '13:40', 2, 'A', $team_id + 2, $team_id + 3);  

        $this->generateMatch($tournament_id, '14:00', 1, 'A', $team_id + 1, $team_id + 4);
        $this->generateMatch($tournament_id, '14:00', 2, 'B', $team_id + 7, $team_id + 10);  

        $this->generateMatch($tournament_id, '14:20', 1, 'B', $team_id + 8, $team_id + 11);
        $this->generateMatch($tournament_id, '14:20', 2, 'B', $team_id + 9, $team_id + 5);

        $this->generateMatch($tournament_id, '15:00', 1, 'F', 1, 2);
        $this->generateMatch($tournament_id, '15:00', 2, 'B', $team_id + 6, $team_id + 7);
        
        $this->generateMatch($tournament_id, '15:20', 1, 'B', $team_id + 9, $team_id + 8);
        $this->generateMatch($tournament_id, '15:20', 2, 'B', $team_id + 10, $team_id + 11);

        $this->generateMatch($tournament_id, '16:00', 1, 'F', 3, 4);
    }

    private function generateTournamentWith16TeamsAtMorning($tournament_id, $team_id) {
        $this->generateMatch($tournament_id, '09:00', 1, 'A', $team_id, $team_id + 1);
        $this->generateMatch($tournament_id, '09:00', 2, 'A', $team_id + 2, $team_id + 3);

        $this->generateMatch($tournament_id, '09:20', 1, 'B', $team_id + 4, $team_id + 5);
        $this->generateMatch($tournament_id, '09:20', 2, 'B', $team_id + 6, $team_id + 7);

        $this->generateMatch($tournament_id, '09:40', 1, 'C', $team_id + 8, $team_id + 9);
        $this->generateMatch($tournament_id, '09:40', 2, 'C', $team_id + 10, $team_id + 11);

        $this->generateMatch($tournament_id, '10:00', 1, 'D', $team_id + 12, $team_id + 13);
        $this->generateMatch($tournament_id, '10:00', 2, 'D', $team_id + 14, $team_id + 15);


        $this->generateMatch($tournament_id, '10:20', 1, 'A', $team_id + 1, $team_id + 2);
        $this->generateMatch($tournament_id, '10:20', 2, 'A', $team_id + 3, $team_id);

        $this->generateMatch($tournament_id, '10:40', 1, 'B', $team_id + 1 + 4, $team_id + 2 + 4);
        $this->generateMatch($tournament_id, '10:40', 2, 'B', $team_id + 3 + 4, $team_id + 4);

        $this->generateMatch($tournament_id, '11:00', 1, 'C', $team_id + 1 + 8, $team_id + 2 + 8);
        $this->generateMatch($tournament_id, '11:00', 2, 'C', $team_id + 3 + 8, $team_id + 8);

        $this->generateMatch($tournament_id, '11:20', 1, 'D', $team_id + 1 + 12, $team_id + 2 + 12);
        $this->generateMatch($tournament_id, '11:20', 2, 'D', $team_id + 3 + 12, $team_id + 12);


        $this->generateMatch($tournament_id, '11:40', 1, 'A', $team_id, $team_id + 2);
        $this->generateMatch($tournament_id, '11:40', 2, 'A', $team_id + 3, $team_id + 1);

        $this->generateMatch($tournament_id, '12:00', 1, 'B', $team_id + 4, $team_id + 2 + 4);
        $this->generateMatch($tournament_id, '12:00', 2, 'B', $team_id + 3 + 4, $team_id + 1 + 4);

        $this->generateMatch($tournament_id, '12:20', 1, 'C', $team_id + 8, $team_id + 2 + 8);
        $this->generateMatch($tournament_id, '12:20', 2, 'C', $team_id + 3 + 8, $team_id + 1 + 8);

        $this->generateMatch($tournament_id, '12:40', 1, 'D', $team_id + 12, $team_id + 2 + 12);
        $this->generateMatch($tournament_id, '12:40', 2, 'D', $team_id + 3 + 12, $team_id + 1 + 12);


        $this->generateMatch($tournament_id, '13:00', 1, 'Q1', 1, 6);
        $this->generateMatch($tournament_id, '13:00', 2, 'Q2', 3, 8);

        $this->generateMatch($tournament_id, '13:20', 1, 'Q3', 5, 2);
        $this->generateMatch($tournament_id, '13:20', 2, 'Q4', 7, 4);

        $this->generateMatch($tournament_id, '13:50', 1, 'S1', 9, 10);
        $this->generateMatch($tournament_id, '13:50', 2, 'S2', 11, 12);

        $this->generateMatch($tournament_id, '14:20', 1, 'F', 13, 14);
        $this->generateMatch($tournament_id, '14:20', 2, 'BF', 15, 16);
    }

    private function generateTournamentWith16TeamsAtNight($tournament_id, $team_id) {
        $this->generateMatch($tournament_id, '14:30', 1, 'A', $team_id + 1, $team_id + 2);
        $this->generateMatch($tournament_id, '14:30', 2, 'A', $team_id, $team_id + 4);

        $this->generateMatch($tournament_id, '14:50', 1, 'B', $team_id + 5, $team_id + 6);
        $this->generateMatch($tournament_id, '14:50', 2, 'B', $team_id + 7, $team_id + 8);

        $this->generateMatch($tournament_id, '15:10', 1, 'C', $team_id + 12, $team_id + 10);
        $this->generateMatch($tournament_id, '15:10', 2, 'C', $team_id + 9, $team_id + 11);

        $this->generateMatch($tournament_id, '15:30', 1, 'D', $team_id + 15, $team_id + 16);
        $this->generateMatch($tournament_id, '15:30', 2, 'D', $team_id + 13, $team_id + 14);


        $this->generateMatch($tournament_id, '15:50', 1, 'A', $team_id, $team_id + 2);
        $this->generateMatch($tournament_id, '15:50', 2, 'A', $team_id + 3, $team_id + 1);

        $this->generateMatch($tournament_id, '16:10', 1, 'B', $team_id + 5, $team_id + 8);
        $this->generateMatch($tournament_id, '16:10', 2, 'B', $team_id + 6, $team_id + 7);

        $this->generateMatch($tournament_id, '16:30', 1, 'C', $team_id + 9, $team_id + 12);
        $this->generateMatch($tournament_id, '16:30', 2, 'C', $team_id + 11, $team_id + 10);

        $this->generateMatch($tournament_id, '16:50', 1, 'A', $team_id + 1, $team_id);
        $this->generateMatch($tournament_id, '16:50', 2, 'A', $team_id + 4, $team_id + 3);

        $this->generateMatch($tournament_id, '17:10', 1, 'D', $team_id + 13, $team_id + 15);
        $this->generateMatch($tournament_id, '17:10', 2, 'D', $team_id + 14, $team_id + 16);

        $this->generateMatch($tournament_id, '17:30', 1, 'B', $team_id + 5, $team_id + 7);
        $this->generateMatch($tournament_id, '17:30', 2, 'B', $team_id + 6, $team_id + 8);

        $this->generateMatch($tournament_id, '17:50', 1, 'A', $team_id + 1, $team_id + 4);
        $this->generateMatch($tournament_id, '17:50', 2, 'A', $team_id + 2, $team_id + 3);

        $this->generateMatch($tournament_id, '18:10', 1, 'C', $team_id + 9, $team_id + 10);
        $this->generateMatch($tournament_id, '18:10', 2, 'C', $team_id + 11, $team_id + 12);

        $this->generateMatch($tournament_id, '18:30', 1, 'D', $team_id + 13, $team_id + 16);
        $this->generateMatch($tournament_id, '18:30', 2, 'D', $team_id + 14, $team_id + 15);

        $this->generateMatch($tournament_id, '18:50', 1, 'A', $team_id, $team_id + 3);
        $this->generateMatch($tournament_id, '18:50', 2, 'A', $team_id + 2, $team_id + 4);
        

        $this->generateMatch($tournament_id, '19:20', 1, 'Q1', 5, 2);
        $this->generateMatch($tournament_id, '19:20', 2, 'Q2', 7, 4);

        $this->generateMatch($tournament_id, '19:40', 1, 'Q3', 1, 6);
        $this->generateMatch($tournament_id, '19:40', 2, 'Q4', 3, 8);

        $this->generateMatch($tournament_id, '20:10', 1, 'S1', 9, 10);
        $this->generateMatch($tournament_id, '20:10', 2, 'S2', 11, 12);

        $this->generateMatch($tournament_id, '20:40', 1, 'F', 13, 14);
        $this->generateMatch($tournament_id, '20:40', 2, 'BF', 15, 16);
    }

    private function generateTournamentCustomG14($tournament_id, $team_id) {
        $this->generateMatch($tournament_id, '09:00', 1, 'A', $team_id + 1, $team_id + 2);
        $this->generateMatch($tournament_id, '09:00', 2, 'A', $team_id, $team_id + 3);

        $this->generateMatch($tournament_id, '09:20', 1, 'B', $team_id + 5, $team_id + 6);
        $this->generateMatch($tournament_id, '09:20', 2, 'B', $team_id + 8, $team_id + 7);

        $this->generateMatch($tournament_id, '09:40', 1, 'C', $team_id + 11, $team_id + 12);
        $this->generateMatch($tournament_id, '09:40', 2, 'C', $team_id + 9, $team_id + 10);

        $this->generateMatch($tournament_id, '10:00', 1, 'A', $team_id, $team_id + 2);
        $this->generateMatch($tournament_id, '10:00', 2, 'A', $team_id + 4, $team_id + 1);

        $this->generateMatch($tournament_id, '10:20', 1, 'B', $team_id + 5, $team_id + 7);
        $this->generateMatch($tournament_id, '10:20', 2, 'B', $team_id + 6, $team_id + 8);

        $this->generateMatch($tournament_id, '10:40', 1, 'A', $team_id + 1, $team_id);
        $this->generateMatch($tournament_id, '10:40', 2, 'A', $team_id + 3, $team_id + 4);

        $this->generateMatch($tournament_id, '11:00', 1, 'C', $team_id + 9, $team_id + 11);
        $this->generateMatch($tournament_id, '11:00', 2, 'C', $team_id + 10, $team_id + 12);

        $this->generateMatch($tournament_id, '11:20', 1, 'A', $team_id + 1, $team_id + 3);
        $this->generateMatch($tournament_id, '11:20', 2, 'A', $team_id + 2, $team_id + 4);

        $this->generateMatch($tournament_id, '11:40', 1, 'B', $team_id + 5, $team_id + 8);
        $this->generateMatch($tournament_id, '11:40', 2, 'B', $team_id + 6, $team_id + 7);

        $this->generateMatch($tournament_id, '12:00', 1, 'C', $team_id + 9, $team_id + 12);
        $this->generateMatch($tournament_id, '12:00', 2, 'C', $team_id + 10, $team_id + 11);

        $this->generateMatch($tournament_id, '12:20', 1, 'A', $team_id, $team_id + 4);
        $this->generateMatch($tournament_id, '12:20', 2, 'A', $team_id + 2, $team_id + 3);

        $this->generateMatch($tournament_id, '12:50', 1, 'Q1', 1, 21);
        $this->generateMatch($tournament_id, '12:50', 2, 'Q2', 4, 6);

        $this->generateMatch($tournament_id, '13:10', 1, 'Q3', 5, 2);
        $this->generateMatch($tournament_id, '13:10', 2, 'Q4', 3, 22);

        $this->generateMatch($tournament_id, '13:40', 1, 'S1', 9, 10);
        $this->generateMatch($tournament_id, '13:40', 2, 'S2', 11, 12);

        $this->generateMatch($tournament_id, '14:10', 1, 'F', 13, 14);
        $this->generateMatch($tournament_id, '14:10', 2, 'BF', 15, 16);
    }

    private function generateTournamentCustomJ17($tournament_id, $team_id) {
        $this->generateMatch($tournament_id, '11:00', 1, 'A', $team_id, $team_id + 1);
        $this->generateMatch($tournament_id, '11:00', 2, 'A', $team_id + 2, $team_id + 3);

        $this->generateMatch($tournament_id, '11:20', 1, 'B', $team_id + 4, $team_id + 6);
        $this->generateMatch($tournament_id, '11:20', 2, 'B', $team_id + 7, $team_id + 5);

        $this->generateMatch($tournament_id, '11:40', 1, 'A', $team_id + 2, $team_id);
        $this->generateMatch($tournament_id, '11:40', 2, 'A', $team_id + 3, $team_id + 1);

        $this->generateMatch($tournament_id, '12:00', 1, 'B', $team_id + 7, $team_id + 4);
        $this->generateMatch($tournament_id, '12:00', 2, 'B', $team_id + 5, $team_id + 6);

        $this->generateMatch($tournament_id, '12:20', 1, 'A', $team_id + 1, $team_id + 2);
        $this->generateMatch($tournament_id, '12:20', 2, 'A', $team_id, $team_id + 3);

        $this->generateMatch($tournament_id, '12:40', 1, 'B', $team_id + 4, $team_id + 5);
        $this->generateMatch($tournament_id, '12:40', 2, 'B', $team_id + 6, $team_id + 7);

        $this->generateMatch($tournament_id, '13:15', 1, 'S1', 1, 4);
        $this->generateMatch($tournament_id, '13:15', 2, 'S2', 3, 2);

        $this->generateMatch($tournament_id, '13:45', 1, 'F', 13, 14);
        $this->generateMatch($tournament_id, '13:45', 2, 'BF', 15, 16);
    }

    private function generateMatch($tournament_id, $kickoff_at, $field, $match_code, $hometeam_id, $awayteam_id) {
        Match::create(array(
            'tournament_id' => $tournament_id,
            'kickoff_at'    => $kickoff_at,
            'field'         => $field,
            'match_code'    => $match_code,
            'hometeam_id'   => $hometeam_id,
            'awayteam_id'   => $awayteam_id,
            'score_home'    => null,
            'score_away'    => null
        ));
    }
}

class GoalsTableSeeder extends Seeder {

    public function run() {

        DB::table('goals')->delete();

        $faker = Faker::create();

        foreach (range(1, 100) as $index) {
            Goal::create(array(
                'match_id'      => $faker->numberBetween(1, 20),
                'player_id'     => $faker->numberBetween(1, 100)
            ));
        }
    }
}
