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

				//$this->call('PlayersTableSeeder');
				//$this->command->info('Player table seeded!');

				$this->call('MatchesTableSeeder');
				$this->command->info('Match table seeded!');

				//$this->call('GoalsTableSeeder');
				//$this->command->info('Goal table seeded!');

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


        /*$faker = Faker::create();

        foreach (range(1, 47) as $index) {
            User::create(array(
                'email' => $faker->email(),
                'password' => Hash::make($faker->word(10)),
                'teacher' => false
            ));
        }*/

    }
}

class TournamentTableSeeder extends Seeder {

    public function run()
    {
        DB::table('tournaments')->delete();

        Tournament::create(array(
            'name' => 'Vanvikan Indoor 2016',
            'date' => '2016-01-16',
            'location' => 'Vanvikanhallen'
        ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        Team::create(array('name' => 'Neset', 'group_code' => 'A')); // 1
				Team::create(array('name' => 'Rissa 1', 'group_code' => 'A')); // 2
				Team::create(array('name' => 'Ørland 2', 'group_code' => 'A')); // 3
				Team::create(array('name' => 'Vanvik 1', 'group_code' => 'A')); // 4

				Team::create(array('name' => 'Leik', 'group_code' => 'B')); // 5
				Team::create(array('name' => 'Åfjord 1', 'group_code' => 'B')); // 6
				Team::create(array('name' => 'Rissa 2', 'group_code' => 'B')); // 7
				Team::create(array('name' => 'Ørland 1', 'group_code' => 'B')); // 8

				Team::create(array('name' => 'Vanvik 2', 'group_code' => 'C')); // 9
				Team::create(array('name' => 'Åfjord 2', 'group_code' => 'C')); // 10
				Team::create(array('name' => 'Fosen', 'group_code' => 'C')); // 11
				Team::create(array('name' => 'Bjørgan', 'group_code' => 'C')); // 12



        Team::create(array('name' => 'Vinner gruppe C')); // 12
        Team::create(array('name' => '2. plass gruppe B')); // 13

        Team::create(array('name' => 'Vinner gruppe B')); // 14
        Team::create(array('name' => '3. plass gruppe A/C')); // 15

        Team::create(array('name' => 'Vinner gruppe A')); // 16
        Team::create(array('name' => '3. plass gruppa C/B')); // 17

        Team::create(array('name' => '2. plass gruppe C')); // 18
        Team::create(array('name' => '2. plass gruppe A')); //19

        Team::create(array('name' => 'Vinner Q1')); // 20
        Team::create(array('name' => 'Vinner Q2')); // 21
        Team::create(array('name' => 'Vinner Q3')); // 22
        Team::create(array('name' => 'Vinner Q4')); // 23

        Team::create(array('name' => 'Vinner S1')); // 24
        Team::create(array('name' => 'Vinner S2')); // 25
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
                'team_id' => $faker->numberBetween(1, 25)
            ));
        }

    }
}

class MatchesTableSeeder extends Seeder {

    public function run() {

        DB::table('matches')->delete();

        $this->generateMatch(1, '10:00', 1, 'B', 5, 6);
        $this->generateMatch(1, '10:20', 1, 'B', 7, 8);

        $this->generateMatch(1, '10:40', 1, 'C', 9, 10);
        $this->generateMatch(1, '11:00', 1, 'C', 11, 12);

        $this->generateMatch(1, '11:20', 1, 'A', 1, 2);
        $this->generateMatch(1, '11:40', 1, 'A', 3, 4);

        $this->generateMatch(1, '12:00', 1, 'B', 6, 7);
        $this->generateMatch(1, '12:20', 1, 'B', 8, 5);

        $this->generateMatch(1, '12:40', 1, 'C', 10, 11);
        $this->generateMatch(1, '13:00', 1, 'C', 12, 9);

        $this->generateMatch(1, '13:20', 1, 'A', 4, 2);
        $this->generateMatch(1, '13:40', 1, 'A', 3, 1);

        $this->generateMatch(1, '14:00', 1, 'B', 5, 7);
        $this->generateMatch(1, '14:20', 1, 'B', 8, 6);

        $this->generateMatch(1, '14:40', 1, 'C', 11, 9);
        $this->generateMatch(1, '15:00', 1, 'C', 12, 10);

        $this->generateMatch(1, '15:20', 1, 'A', 4, 1);
        $this->generateMatch(1, '15:40', 1, 'A', 2, 3);




				$this->generateMatch(1, '16:00', 1, 'Q1', 13, 14);
        $this->generateMatch(1, '16:20', 1, 'Q2', 15, 16);

        $this->generateMatch(1, '16:40', 1, 'Q3', 17, 18);
        $this->generateMatch(1, '17:00', 1, 'Q4', 19, 20);

        $this->generateMatch(1, '17:20', 1, 'S1', 21, 22);
        $this->generateMatch(1, '17:40', 1, 'S2', 23, 24);

        $this->generateMatch(1, '18:10', 1, 'F', 25, 26);







        // $this->generateMatch(1, '11:00', 1, 'A', 1, 4);
        // $this->generateMatch(1, '11:00', 2, 'A', 2, 5);
				//
        // $this->generateMatch(1, '11:15', 1, 'B', 1+5, 4+5);
        // $this->generateMatch(1, '11:15', 2, 'B', 2+5, 5+5);
				//
        // $this->generateMatch(1, '11:30', 1, 'C', 1+10, 4+10);
        // $this->generateMatch(1, '11:30', 2, 'C', 2+10, 5+10);
				//
        // $this->generateMatch(1, '11:45', 1, 'D', 1+15, 4+15);
        // $this->generateMatch(1, '11:45', 2, 'D', 2+15, 5+15);
				//
				//
        // $this->generateMatch(1, '12:00', 1, 'A', 1, 3);
        // $this->generateMatch(1, '12:00', 2, 'A', 4, 5);
				//
        // $this->generateMatch(1, '12:15', 1, 'B', 1+5, 3+5);
        // $this->generateMatch(1, '12:15', 2, 'B', 4+5, 5+5);
				//
        // $this->generateMatch(1, '12:30', 1, 'C', 1+10, 3+10);
        // $this->generateMatch(1, '12:30', 2, 'C', 4+10, 5+10);
				//
        // $this->generateMatch(1, '12:45', 1, 'D', 1+15, 3+15);
        // $this->generateMatch(1, '12:45', 2, 'D', 4+15, 5+15);
				//
				//
        // $this->generateMatch(1, '13:00', 1, 'A', 1, 2);
        // $this->generateMatch(1, '13:00', 2, 'A', 3, 4);
				//
        // $this->generateMatch(1, '13:15', 1, 'B', 1+5, 2+5);
        // $this->generateMatch(1, '13:15', 2, 'B', 3+5, 4+5);
				//
        // $this->generateMatch(1, '13:30', 1, 'C', 1+10, 2+10);
        // $this->generateMatch(1, '13:30', 2, 'C', 3+10, 4+10);
				//
        // $this->generateMatch(1, '13:45', 1, 'D', 1+15, 2+15);
        // $this->generateMatch(1, '13:45', 2, 'D', 3+15, 4+15);
				//
				//
        // $this->generateMatch(1, '14:00', 1, 'A', 1, 5);
        // $this->generateMatch(1, '14:00', 2, 'A', 2, 3);
				//
        // $this->generateMatch(1, '14:15', 1, 'B', 1+5, 5+5);
        // $this->generateMatch(1, '14:15', 2, 'B', 2+5, 3+5);
				//
        // $this->generateMatch(1, '14:30', 1, 'C', 1+10, 5+10);
        // $this->generateMatch(1, '14:30', 2, 'C', 2+10, 3+10);
				//
        // $this->generateMatch(1, '14:45', 1, 'D', 1+15, 5+15);
        // $this->generateMatch(1, '14:45', 2, 'D', 2+15, 3+15);
				//
				//
        // $this->generateMatch(1, '15:00', 1, 'A', 2, 4);
        // $this->generateMatch(1, '15:00', 2, 'A', 3, 5);
				//
        // $this->generateMatch(1, '15:15', 1, 'B', 2+5, 4+5);
        // $this->generateMatch(1, '15:15', 2, 'B', 3+5, 5+5);
				//
        // $this->generateMatch(1, '15:30', 1, 'C', 2+10, 4+10);
        // $this->generateMatch(1, '15:30', 2, 'C', 3+10, 5+10);
				//
        // $this->generateMatch(1, '15:45', 1, 'D', 2+15, 4+15);
        // $this->generateMatch(1, '15:45', 2, 'D', 3+15, 5+15);

        //$this->generateMatch(1, '16:00', 1, 'Q1', null, null);
        //$this->generateMatch(1, '16:00', 2, 'Q2', null, null);

        //$this->generateMatch(1, '16:15', 1, 'Q3', null, null);
        //$this->generateMatch(1, '16:15', 2, 'Q4', null, null);

        //$this->generateMatch(1, '16:45', 1, 'S1', null, null);
        //$this->generateMatch(1, '16:45', 2, 'S2', null, null);

        //$this->generateMatch(1, '17:15', 1, 'F', null, null);

    }

    private function generateMatch($tournament_id, $kickoff_at, $field, $match_code, $hometeam_id, $awayteam_id) {
        $faker = Faker::create();

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
                'match_id'      => $faker->numberBetween(1, 25),
                'player_id'     => $faker->numberBetween(1, 100)
            ));
        }
    }
}
