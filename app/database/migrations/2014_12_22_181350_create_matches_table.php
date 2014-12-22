<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;

class CreateMatchesTable extends Migration {

	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('matches', function(Blueprint $table)
		{
			$table->increments('id');
			$table->integer('tournament_id')->unsigned()->index()->nullable();
			$table->foreign('tournament_id')->references('id')->on('tournaments')->onDelete('set null');
			$table->time('kickoff_at')->nullable();
			$table->enum('match_code', ['A', 'B', 'C', 'D', 'W', 'Q1' 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'F']);
			$table->integer('team_id_home')->unsigned()->index()->nullable();
			$table->foreign('team_id_home')->references('id')->on('teams')->onDelete('set null');
			$table->integer('team_id_away')->unsigned()->index()->nullable();
			$table->foreign('team_id_away')->references('id')->on('teams')->onDelete('set null');
			$table->integer('score_home')->unsigned()->nullable();
			$table->integer('score_away')->unsigned()->nullable();
			$table->timestamps();
		});
	}


	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::drop('matches');
	}

}
